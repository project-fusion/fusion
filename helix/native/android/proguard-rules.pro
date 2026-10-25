# What an app's release build keeps of the theme engine when it shrinks its
# code. JNA finds the engine's functions by the names of the Kotlin that
# declares them, and finds its own classes by reflection.
-dontwarn java.awt.**
-keep class com.sun.jna.** { *; }
-keep class * implements com.sun.jna.** { *; }
-keep class dev.fusion.helix.theme.engine.** { *; }
