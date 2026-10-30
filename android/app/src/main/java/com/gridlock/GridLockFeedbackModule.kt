package com.gridlock

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.media.MediaPlayer
import android.media.AudioManager
import android.media.AudioFocusRequest
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.LifecycleEventListener
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** Predecoded native cues: no filesystem or decoding work on a gameplay tap. */
class GridLockFeedbackModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context), LifecycleEventListener {
  private val main = Handler(Looper.getMainLooper())
  private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private var music: MediaPlayer? = null
  private var musicPrepared = false
  private var musicEnabled = false
  private var musicVolume = 0.28f
  private var foreground = false
  private var focusHeld = false
  private var ducked = false
  private val musicAttributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()
  private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
    main.post {
      when (change) {
        AudioManager.AUDIOFOCUS_GAIN -> { focusHeld = true; ducked = false; updateMusic() }
        AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> { ducked = true; updateMusic() }
        else -> { focusHeld = false; if (musicPrepared) music?.pause() }
      }
    }
  }
  private val focusRequest by lazy {
    if (Build.VERSION.SDK_INT >= 26) AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(musicAttributes).setOnAudioFocusChangeListener(focusListener, main).build() else null
  }
  init { context.addLifecycleEventListener(this) }

  @Suppress("DEPRECATION")
  private fun requestFocus(): Boolean {
    val result = if (Build.VERSION.SDK_INT >= 26) audioManager.requestAudioFocus(focusRequest!!) else audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
    focusHeld = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    return focusHeld
  }
  @Suppress("DEPRECATION")
  private fun abandonFocus() {
    if (Build.VERSION.SDK_INT >= 26) audioManager.abandonAudioFocusRequest(focusRequest!!) else audioManager.abandonAudioFocus(focusListener)
    focusHeld = false; ducked = false
  }
  private fun updateMusic() {
    if (!musicPrepared) return
    val volume = musicVolume * (if (ducked) 0.2f else 1f)
    music?.setVolume(volume, volume)
    if (musicEnabled && foreground && focusHeld) music?.start() else music?.pause()
  }
  @ReactMethod fun setMusic(enabled: Boolean, volume: Double) {
    main.post {
      musicEnabled = enabled; musicVolume = volume.toFloat().coerceIn(0f, 1f)
      if (!enabled) { updateMusic(); abandonFocus(); return@post }
      if (!foreground) return@post
      if (!focusHeld) requestFocus()
      if (music == null) {
        val player = MediaPlayer(); music = player
        player.setAudioAttributes(musicAttributes)
        context.resources.openRawResourceFd(R.raw.gl_bgm).use { file -> player.setDataSource(file.fileDescriptor, file.startOffset, file.length) }
        player.isLooping = true
        player.setOnPreparedListener { musicPrepared = true; updateMusic() }
        player.setOnErrorListener { _, _, _ -> musicPrepared = false; player.release(); music = null; true }
        player.prepareAsync()
      }
      updateMusic()
    }
  }
  override fun onHostResume() { main.post { foreground = true; if (musicEnabled) setMusic(true, musicVolume.toDouble()) } }
  override fun onHostPause() { main.post { foreground = false; updateMusic(); abandonFocus() } }
  override fun onHostDestroy() { onHostPause() }
  private val sounds = mutableMapOf<String, Int>()
  private val waiting = mutableListOf<Promise>()
  private var loaded = 0
  private var ready = false
  private val poolDelegate = lazy {
    SoundPool.Builder().setMaxStreams(4).setAudioAttributes(
      // Gameplay cues belong to media volume, not the phone's muted system-touch stream.
      AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
    ).build()
  }
  private val pool by poolDelegate
  override fun getName() = "GridLockFeedback"
  override fun getConstants(): MutableMap<String, Any> {
    val resource = context.resources.getIdentifier("default_web_client_id", "string", context.packageName)
    return mutableMapOf("googleWebClientId" to (if (resource == 0) "" else context.getString(resource)), "qaEnabled" to BuildConfig.QA_ENABLED, "appVersion" to BuildConfig.VERSION_NAME, "buildNumber" to BuildConfig.VERSION_CODE.toString(), "buildType" to BuildConfig.BUILD_TYPE, "deviceModel" to "${Build.MANUFACTURER} ${Build.MODEL}")
  }

  @ReactMethod fun diagnosticsTest(promise: Promise) {
    promise.resolve(if (BuildConfig.QA_ENABLED) context.currentActivity?.intent?.getStringExtra("diagnostics_test") ?: "" else "")
  }
  @ReactMethod fun initialPreview(promise: Promise) {
    promise.resolve(if (BuildConfig.QA_ENABLED) context.currentActivity?.intent?.getIntExtra("preview_level", 60) ?: 60 else 0)
  }
  @ReactMethod fun recordQA(name: String, value: String) {
    if (BuildConfig.QA_ENABLED) android.util.Log.i("GridLockQA", name + ":" + value)
  }

  @ReactMethod fun preload(promise: Promise) {
    if (ready) { promise.resolve(true); return }
    waiting.add(promise)
    if (sounds.isNotEmpty()) return
    val resources = mapOf("move" to R.raw.gl_move, "blocked" to R.raw.gl_blocked,
      "exit" to R.raw.gl_exit, "win" to R.raw.gl_win, "coin" to R.raw.gl_coin, "tap" to R.raw.gl_tap)
    pool.setOnLoadCompleteListener { _, _, status ->
      if (status != 0) {
        waiting.forEach { it.reject("AUDIO_LOAD", "Unable to preload sound") }; waiting.clear()
      } else {
        loaded++
        if (loaded == resources.size) {
          ready = true; waiting.forEach { it.resolve(true) }; waiting.clear()
        }
      }
    }
    resources.forEach { (name, resource) -> sounds[name] = pool.load(context, resource, 1) }
  }

  @ReactMethod fun play(name: String) {
    if (!ready) return
    sounds[name]?.let { pool.play(it, 0.55f, 0.55f, 1, 0, 1f) }
  }

  @Suppress("DEPRECATION")
  @ReactMethod fun haptic(kind: String) {
    val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
    if (!vibrator.hasVibrator()) return
    val duration = if (kind == "win") 18L else 8L
    if (Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createOneShot(duration, 70))
    else vibrator.vibrate(duration)
  }

  override fun invalidate() {
    context.removeLifecycleEventListener(this)
    main.post { musicEnabled = false; musicPrepared = false; music?.release(); music = null; abandonFocus() }
    if (poolDelegate.isInitialized()) pool.release()
    waiting.forEach { it.reject("AUDIO_CLOSED", "Audio module closed") }; waiting.clear()
    super.invalidate()
  }
}
