# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Native feedback is invoked by the React Native bridge after minification.
-keep class com.gridlock.GridLockFeedbackModule { *; }
-keep class com.gridlock.GridLockFeedbackPackage { *; }

# GMA transitively resolves WorkManager 2.7 / Room 2.2.5. Its consumer rules
# retain WorkDatabase_Impl but omit the constructor invoked reflectively.
# R8 full mode removes that constructor and startup crashes before RN mounts.
-keepclassmembers class androidx.work.impl.WorkDatabase_Impl {
    public <init>();
}
