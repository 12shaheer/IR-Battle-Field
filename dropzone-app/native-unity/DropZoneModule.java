package com.dropzone.unity;
import android.content.Intent;
import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.unity3d.player.UnityPlayer;
import java.lang.ref.WeakReference;

public final class DropZoneModule extends ReactContextBaseJavaModule {
  private static WeakReference<ReactApplicationContext> context = new WeakReference<>(null);
  private static WeakReference<DropZoneActivity> active = new WeakReference<>(null);
  private static final Handler main = new Handler(Looper.getMainLooper());
  private static volatile String state = "{}";
  private static volatile boolean ready = false, exitRequested = false;
  private static Promise launchPromise;
  private static Runnable watchdog;
  public DropZoneModule(ReactApplicationContext ctx) { super(ctx); context = new WeakReference<>(ctx); }
  @Override public String getName() { return "DropZoneUnity"; }
  @ReactMethod public void addListener(String name) {}
  @ReactMethod public void removeListeners(double count) {}
  @ReactMethod public void launch(String value, Promise promise) {
    Activity activity = getCurrentActivity();
    if (activity == null) { promise.reject("NO_ACTIVITY", "App is not in the foreground"); return; }
    main.post(() -> {
      DropZoneActivity existing = active.get();
      if (launchPromise != null || (existing != null && !existing.isFinishing())) {
        promise.reject("UNITY_ACTIVE", "Unity is already starting or running. Return from it before retrying."); return;
      }
      state = value; ready = false; exitRequested = false; launchPromise = promise;
      watchdog = () -> failStartup("Unity did not render a gameplay frame within 45 seconds. Return and retry. Check Android Unity logs if this repeats.");
      main.postDelayed(watchdog, 45000);
      try { activity.startActivity(new Intent(activity, DropZoneActivity.class)); }
      catch (Exception e) { failStartup("Could not launch Unity: " + e.getMessage()); }
    });
  }
  static void attach(DropZoneActivity activity) { active = new WeakReference<>(activity); }
  static Activity getReactActivity() {
    ReactApplicationContext ctx = context.get();
    return ctx == null ? null : ctx.getCurrentActivity();
  }
  static boolean isMedicalLocked() {
    try { return "healing".equals(new org.json.JSONObject(state).optString("medicalMode")); }
    catch (Exception error) { return false; }
  }
  static boolean isReady() { return ready; }
  @ReactMethod public void updateState(String value) { state = value; if (ready) command("ApplyState", value); }
  @ReactMethod public void send(String method, String value) {
    if (!method.equals("PresentShot") && !method.equals("PresentHit") && !method.equals("PresentReload") && !method.equals("ExitGameplay")) return;
    if (method.equals("ExitGameplay")) exitRequested = true;
    if (ready) command(method, value);
  }
  private static void command(String method, String value) { UnityPlayer.UnitySendMessage("DropZone Camera Gameplay", method, value); }
  private static void cancelWatchdog() { if (watchdog != null) main.removeCallbacks(watchdog); watchdog = null; }
  private static void failStartup(String message) {
    main.post(() -> {
      cancelWatchdog(); ready = false;
      if (launchPromise != null) { launchPromise.reject("UNITY_STARTUP", message); launchPromise = null; }
      DropZoneActivity activity = active.get(); if (activity != null) activity.showStartupError(message);
      publish("error", message);
    });
  }
  public static void emit(String type, String value) {
    if (type.equals("ready")) {
      main.post(() -> {
        cancelWatchdog(); ready = true;
        DropZoneActivity activity = active.get(); if (activity != null) activity.markReady();
        command("ApplyState", state);
        if (exitRequested) command("ExitGameplay", "");
        if (launchPromise != null) { launchPromise.resolve(true); launchPromise = null; }
        publish(type, value);
      });
    } else if (type.equals("error")) failStartup(value);
    else if (type.equals("closed")) {
      main.post(() -> {
        cancelWatchdog(); ready = false; active.clear();
        if (launchPromise != null) { launchPromise.reject("UNITY_CANCELLED", "Unity closed before its first frame."); launchPromise = null; }
        publish(type, value);
      });
    } else publish(type, value);
  }
  private static void publish(String type, String value) {
    ReactApplicationContext ctx = context.get();
    if (ctx == null || !ctx.hasActiveReactInstance()) return;
    ctx.runOnUiQueueThread(() -> {
      WritableMap event = Arguments.createMap(); event.putString("type", type); event.putString("value", value);
      ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("DropZoneUnityEvent", event);
    });
  }
}
