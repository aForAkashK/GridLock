#import <React/RCTBridgeModule.h>
#import <AudioToolbox/AudioToolbox.h>
#import <UIKit/UIKit.h>
#import <AVFoundation/AVFoundation.h>

@interface GridLockFeedback : NSObject <RCTBridgeModule>
@property(nonatomic, strong) NSMutableDictionary<NSString *, NSNumber *> *sounds;
@property(nonatomic, strong) AVAudioPlayer *music;
@property(nonatomic) BOOL musicEnabled;
@property(nonatomic) BOOL foreground;
@property(nonatomic) BOOL interrupted;
@property(nonatomic) float musicVolume;
@end
@implementation GridLockFeedback
RCT_EXPORT_MODULE();
- (instancetype)init {
  if ((self = [super init])) {
    _musicVolume = 0.28f;
    dispatch_async(dispatch_get_main_queue(), ^{ self.foreground = UIApplication.sharedApplication.applicationState == UIApplicationStateActive; });
    NSNotificationCenter *center = NSNotificationCenter.defaultCenter;
    [center addObserver:self selector:@selector(suspendMusic:) name:UIApplicationWillResignActiveNotification object:nil];
    [center addObserver:self selector:@selector(resumeMusic:) name:UIApplicationDidBecomeActiveNotification object:nil];
    [center addObserver:self selector:@selector(interruption:) name:AVAudioSessionInterruptionNotification object:nil];
    [center addObserver:self selector:@selector(routeChanged:) name:AVAudioSessionRouteChangeNotification object:nil];
  }
  return self;
}
- (void)updateMusic {
  if (self.musicEnabled && self.foreground && !self.interrupted) {
    AVAudioSession *session = AVAudioSession.sharedInstance;
    if (![session setCategory:AVAudioSessionCategoryAmbient error:nil] || ![session setActive:YES error:nil]) return;
    if (!self.music) {
      NSURL *url = [NSBundle.mainBundle URLForResource:@"toy_town" withExtension:@"m4a" subdirectory:@"Audio"];
      if (!url) return;
      self.music = [[AVAudioPlayer alloc] initWithContentsOfURL:url error:nil];
      self.music.numberOfLoops = -1;
      [self.music prepareToPlay];
    }
    self.music.volume = self.musicVolume;
    [self.music play];
  } else {
    [self.music pause];
  }
}
RCT_EXPORT_METHOD(setMusic:(BOOL)enabled volume:(double)volume) {
  dispatch_async(dispatch_get_main_queue(), ^{
    self.musicEnabled = enabled; self.interrupted = NO; self.musicVolume = fmin(1, fmax(0, volume));
    [self updateMusic];
  });
}
- (void)suspendMusic:(NSNotification *)notification {
  self.foreground = NO; [self.music pause];
  [AVAudioSession.sharedInstance setActive:NO withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation error:nil];
}
- (void)resumeMusic:(NSNotification *)notification { self.foreground = YES; [self updateMusic]; }
- (void)interruption:(NSNotification *)notification {
  dispatch_async(dispatch_get_main_queue(), ^{
    BOOL began = [notification.userInfo[AVAudioSessionInterruptionTypeKey] unsignedIntegerValue] == AVAudioSessionInterruptionTypeBegan;
    self.interrupted = began;
    if (began) [self.music pause];
    else if ([notification.userInfo[AVAudioSessionInterruptionOptionKey] unsignedIntegerValue] & AVAudioSessionInterruptionOptionShouldResume) [self updateMusic];
  });
}
- (void)routeChanged:(NSNotification *)notification {
  if ([notification.userInfo[AVAudioSessionRouteChangeReasonKey] unsignedIntegerValue] == AVAudioSessionRouteChangeReasonOldDeviceUnavailable) {
    dispatch_async(dispatch_get_main_queue(), ^{ self.interrupted = YES; [self.music pause]; });
  }
}
+ (BOOL)requiresMainQueueSetup { return NO; }
- (NSDictionary *)constantsToExport {
  NSString *path = [[NSBundle mainBundle] pathForResource:@"GoogleService-Info" ofType:@"plist"];
  NSDictionary *config = path ? [NSDictionary dictionaryWithContentsOfFile:path] : @{};
  NSDictionary *info = NSBundle.mainBundle.infoDictionary;
#if DEBUG
  NSString *buildType = @"debug";
#else
  NSString *buildType = @"release";
#endif
  return @{ @"googleWebClientId": config[@"SERVER_CLIENT_ID"] ?: @"", @"googleIosClientId": config[@"CLIENT_ID"] ?: @"", @"appVersion": info[@"CFBundleShortVersionString"] ?: @"unknown", @"buildNumber": info[@"CFBundleVersion"] ?: @"unknown", @"buildType": buildType, @"deviceModel": UIDevice.currentDevice.model };
}
RCT_REMAP_METHOD(preload, preloadWithResolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  if (!self.sounds) {
    self.sounds = [NSMutableDictionary new];
    for (NSString *name in @[@"move", @"blocked", @"exit", @"win", @"coin", @"tap"]) {
      NSURL *url = [[NSBundle mainBundle] URLForResource:name withExtension:@"wav" subdirectory:@"Audio"];
      SystemSoundID sound = 0;
      if (!url || AudioServicesCreateSystemSoundID((__bridge CFURLRef)url, &sound) != kAudioServicesNoError) {
        reject(@"AUDIO_LOAD", @"Unable to preload sound", nil); return;
      }
      self.sounds[name] = @(sound);
    }
  }
  resolve(@YES);
}
RCT_EXPORT_METHOD(play:(NSString *)name) {
  NSNumber *sound = self.sounds[name];
  if (sound) AudioServicesPlaySystemSound(sound.unsignedIntValue);
}
RCT_EXPORT_METHOD(haptic:(NSString *)kind) {
  dispatch_async(dispatch_get_main_queue(), ^{
    UIImpactFeedbackGenerator *feedback = [[UIImpactFeedbackGenerator alloc] initWithStyle:[kind isEqualToString:@"win"] ? UIImpactFeedbackStyleMedium : UIImpactFeedbackStyleLight];
    [feedback prepare]; [feedback impactOccurred];
  });
}
- (void)dealloc { [NSNotificationCenter.defaultCenter removeObserver:self]; [self.music stop]; for (NSNumber *sound in self.sounds.allValues) AudioServicesDisposeSystemSoundID(sound.unsignedIntValue); }
@end
