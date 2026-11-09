package com.dropzone.unity;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.Collections;
import java.util.List;
public final class DropZonePackage implements ReactPackage {
  public List<NativeModule> createNativeModules(ReactApplicationContext context) { return Collections.singletonList(new DropZoneModule(context)); }
  public List<ViewManager> createViewManagers(ReactApplicationContext context) { return Collections.emptyList(); }
}
