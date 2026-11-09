package com.dropzone.unity;
import android.os.Bundle;
import android.app.Activity;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import com.unity3d.player.UnityPlayerActivity;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactHost;

public final class DropZoneActivity extends UnityPlayerActivity {
  private LinearLayout startup;
  private TextView message;
  private Activity reactActivity;
  // Unity becomes the foreground host while React keeps server/BLE ownership.
  @Override protected void onResume() {
    super.onResume();
    ReactApplication app = (ReactApplication) getApplication();
    ReactHost host = app.getReactHost();
    // Expo's onHostResume requires an AppCompatActivity. Unity's Activity is
    // not one: keep the original React Activity as the React/Expo host while
    // resuming its timers for the foreground gameplay session.
    if (reactActivity != null) {
      if (host != null) host.onHostResume(reactActivity);
      else app.getReactNativeHost().getReactInstanceManager().onHostResume(reactActivity);
    }
  }
  @Override protected void onPause() {
    ReactApplication app = (ReactApplication) getApplication();
    ReactHost host = app.getReactHost();
    if (reactActivity != null) {
      if (host != null) host.onHostPause(reactActivity);
      else app.getReactNativeHost().getReactInstanceManager().onHostPause(reactActivity);
    }
    super.onPause();
  }
  @Override protected void onCreate(Bundle saved) {
    reactActivity = DropZoneModule.getReactActivity();
    DropZoneModule.attach(this);
    super.onCreate(saved);
    startup = new LinearLayout(this); startup.setOrientation(LinearLayout.VERTICAL);
    startup.setGravity(Gravity.CENTER); startup.setPadding(40, 30, 40, 30); startup.setBackgroundColor(0xff09141e);
    message = new TextView(this); message.setTextColor(0xffa9edff); message.setTextSize(18); message.setGravity(Gravity.CENTER);
    message.setText("Starting DropZone…\nPreparing the Unity renderer");
    startup.addView(message);
    addContentView(startup, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
  }
  void markReady() { if (startup != null) startup.setVisibility(View.GONE); }
  void showStartupError(String text) {
    if (startup == null) return;
    startup.setVisibility(View.VISIBLE); message.setText(text);
    if (startup.getChildCount() == 1) { Button back = new Button(this); back.setText("RETURN"); back.setOnClickListener(view -> closeUnity()); startup.addView(back); }
  }
  private void closeUnity() {
    if (DropZoneModule.isReady()) com.unity3d.player.UnityPlayer.UnitySendMessage("DropZone Camera Gameplay", "ExitGameplay", "");
    else if (mUnityPlayer != null) mUnityPlayer.unload();
  }
  @Override public void onBackPressed() { if (DropZoneModule.isMedicalLocked()) return; closeUnity(); }
  @Override public void onUnityPlayerUnloaded() { runOnUiThread(() -> { DropZoneModule.emit("closed", ""); finish(); }); }
  @Override public void onUnityPlayerQuitted() { DropZoneModule.emit("closed", ""); }
}
