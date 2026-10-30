package com.gridlock

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.views.imagehelper.ImageSource
import com.facebook.drawee.backends.pipeline.Fresco
import com.facebook.datasource.BaseDataSubscriber
import com.facebook.datasource.DataSource
import com.facebook.common.executors.CallerThreadExecutor
import com.facebook.imagepipeline.request.ImageRequestBuilder

/** Warm the same decoded bitmap cache used by RN Image, never the network. */
class GridLockAssetsModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "GridLockAssets"

  @ReactMethod fun warmLocalImage(name: String, promise: Promise) {
    try {
      val source = ImageSource(context, name)
      // Metro debug URLs are deliberately excluded. Release resources only.
      if (!source.isResource) { promise.resolve(false); return }
      val request = ImageRequestBuilder.newBuilderWithSource(source.uri).build()
      val task = Fresco.getImagePipeline().prefetchToBitmapCache(request, context)
      task.subscribe(object : BaseDataSubscriber<Void>() {
        override fun onNewResultImpl(dataSource: DataSource<Void>) {
          if (dataSource.isFinished) promise.resolve(true)
        }
        override fun onFailureImpl(dataSource: DataSource<Void>) {
          promise.resolve(false)
        }
      }, CallerThreadExecutor.getInstance())
    } catch (_: Exception) {
      // Optional optimization; failed warming must never stop rendering.
      promise.resolve(false)
    }
  }
}
