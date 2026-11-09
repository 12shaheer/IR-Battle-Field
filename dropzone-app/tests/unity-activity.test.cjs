const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Compile the real Activity against a small lifecycle contract, including Expo's
// AppCompatActivity requirement. This runs Java, not a source-text assertion.
test('Unity keeps the compatible React Activity as host in both RN architectures', t => {
  const jdk = process.env.JAVA_HOME || '/Applications/Unity/Hub/Editor/6000.5.6f1/PlaybackEngines/AndroidPlayer/OpenJDK';
  const javac = path.join(jdk, 'bin/javac'), java = path.join(jdk, 'bin/java');
  if (!fs.existsSync(javac)) return t.skip('Set JAVA_HOME to run Java lifecycle regression check');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dropzone-activity-test-'));
  const sources = {
    'android/os/Bundle.java': 'package android.os; public class Bundle {}',
    'android/view/View.java': 'package android.view; public class View { public static final int GONE=8,VISIBLE=0; public void setVisibility(int v) {} }',
    'android/view/ViewGroup.java': 'package android.view; public class ViewGroup extends View { public static class LayoutParams { public static final int MATCH_PARENT=-1; public LayoutParams(int w,int h) {} } }',
    'android/view/Gravity.java': 'package android.view; public class Gravity { public static final int CENTER=17; }',
    'android/app/Activity.java': 'package android.app; public class Activity { public static Object app; public Object getApplication(){return app;} public void addContentView(android.view.View v,android.view.ViewGroup.LayoutParams p){} public boolean isFinishing(){return false;} public void finish(){} public void runOnUiThread(Runnable r){r.run();} }',
    'androidx/appcompat/app/AppCompatActivity.java': 'package androidx.appcompat.app; public class AppCompatActivity extends android.app.Activity {}',
    'android/widget/LinearLayout.java': 'package android.widget; public class LinearLayout extends android.view.View { public static final int VERTICAL=1; public LinearLayout(android.app.Activity a){} public void setOrientation(int v){} public void setGravity(int v){} public void setPadding(int a,int b,int c,int d){} public void setBackgroundColor(int c){} public void addView(android.view.View v){} public int getChildCount(){return 1;} }',
    'android/widget/TextView.java': 'package android.widget; public class TextView extends android.view.View { public TextView(android.app.Activity a){} public void setTextColor(int c){} public void setTextSize(int s){} public void setGravity(int g){} public void setText(String t){} }',
    'android/widget/Button.java': 'package android.widget; public class Button extends TextView { public Button(android.app.Activity a){super(a);} public void setOnClickListener(java.util.function.Consumer<android.view.View> l){} }',
    'com/unity3d/player/UnityPlayer.java': 'package com.unity3d.player; public class UnityPlayer { public static void UnitySendMessage(String a,String b,String c){} public void unload(){} }',
    'com/unity3d/player/UnityPlayerActivity.java': 'package com.unity3d.player; public class UnityPlayerActivity extends android.app.Activity { protected UnityPlayer mUnityPlayer; protected void onCreate(android.os.Bundle b){} protected void onResume(){} protected void onPause(){} public void onBackPressed(){} public void onUnityPlayerUnloaded(){} public void onUnityPlayerQuitted(){} }',
    'com/facebook/react/ReactHost.java': `package com.facebook.react; public class ReactHost {
      public android.app.Activity current; public int resumes,pauses;
      public void onHostResume(android.app.Activity a){
        if(!(a instanceof androidx.appcompat.app.AppCompatActivity)) throw new IllegalStateException("Current Activity is of incorrect class, expected AppCompatActivity");
        current=a; resumes++;
      }
      public void onHostPause(android.app.Activity a){if(a!=current)throw new IllegalStateException("Wrong host paused");pauses++;}
    }`,
    'com/facebook/react/ReactNativeHost.java': 'package com.facebook.react; public class ReactNativeHost { public final ReactHost manager=new ReactHost(); public ReactHost getReactInstanceManager(){return manager;} }',
    'com/facebook/react/ReactApplication.java': 'package com.facebook.react; public interface ReactApplication { ReactHost getReactHost(); ReactNativeHost getReactNativeHost(); }',
    'com/dropzone/unity/DropZoneModule.java': 'package com.dropzone.unity; class DropZoneModule { static android.app.Activity original; static android.app.Activity getReactActivity(){return original;} static void attach(DropZoneActivity a){} static boolean isReady(){return false;} static boolean isMedicalLocked(){return false;} static void emit(String a,String b){} }',
    'com/dropzone/unity/LifecycleCheck.java': `package com.dropzone.unity;
      public class LifecycleCheck {
        static class App implements com.facebook.react.ReactApplication {
          com.facebook.react.ReactHost host; final com.facebook.react.ReactNativeHost legacy=new com.facebook.react.ReactNativeHost();
          public com.facebook.react.ReactHost getReactHost(){return host;}
          public com.facebook.react.ReactNativeHost getReactNativeHost(){return legacy;}
        }
        public static void main(String[] args){
          for(boolean modern:new boolean[]{true,false}){
            App app=new App(); if(modern)app.host=new com.facebook.react.ReactHost(); android.app.Activity.app=app;
            android.app.Activity original=new androidx.appcompat.app.AppCompatActivity(); DropZoneModule.original=original;
            DropZoneActivity unity=new DropZoneActivity(); unity.onCreate(null); unity.onResume(); unity.onPause();
            com.facebook.react.ReactHost host=modern?app.host:app.legacy.manager;
            if(host.current!=original||host.resumes!=1||host.pauses!=1)throw new AssertionError("React host ownership changed");
          }
        }
      }`,
  };
  try {
    sources['com/dropzone/unity/DropZoneActivity.java'] = fs.readFileSync(path.join(__dirname, '../native-unity/DropZoneActivity.java'), 'utf8');
    for (const [relative, content] of Object.entries(sources)) {
      const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content);
    }
    const compile = spawnSync(javac, ['-encoding', 'UTF-8', '-d', root, ...Object.keys(sources).map(file => path.join(root, file))], { encoding: 'utf8' });
    assert.equal(compile.status, 0, compile.stderr);
    const result = spawnSync(java, ['-cp', root, 'com.dropzone.unity.LifecycleCheck'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
