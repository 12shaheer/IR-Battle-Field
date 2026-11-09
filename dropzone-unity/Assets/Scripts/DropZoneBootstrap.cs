using UnityEngine;
using UnityEngine.Scripting;

[Preserve]
public static class DropZoneBootstrap
{
#if UNITY_WEBGL && !UNITY_EDITOR
    [System.Runtime.InteropServices.DllImport("__Internal")]static extern void DropZoneWebError(string message);
#endif
    static bool reporting;
    static bool rendered;
    public static void MarkRendered(){rendered=true;}
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    static void InstallDiagnostics() {
        rendered=false;Application.logMessageReceived-=Report;Application.logMessageReceived+=Report;
        // CreatePrimitive adds these native components internally. Explicit roots
        // prevent player stripping from removing types absent from the scene.
        System.GC.KeepAlive(new System.Type[]{typeof(SphereCollider),typeof(CapsuleCollider),typeof(BoxCollider),typeof(MeshCollider),typeof(MeshRenderer),typeof(MeshFilter)});
    }
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void EnsureGameplay() {
        if(Object.FindFirstObjectByType<DropZoneGameplay>()==null)new GameObject("DropZone Camera Gameplay").AddComponent<DropZoneGameplay>();
    }
    static void Report(string condition,string stack,LogType type) {
        if(reporting||(type!=LogType.Exception&&type!=LogType.Error)||(rendered&&type==LogType.Error))return;
#if UNITY_WEBGL && !UNITY_EDITOR
        DropZoneWebError(condition);
#endif
#if UNITY_ANDROID && !UNITY_EDITOR
        reporting=true;
        try {using(var bridge=new AndroidJavaClass("com.dropzone.unity.DropZoneModule"))bridge.CallStatic("emit","error",condition);}
        catch(System.Exception) {}finally {reporting=false;}
#endif
    }
}
