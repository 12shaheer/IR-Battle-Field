using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class DropZoneSetup
{
    [MenuItem("DropZone/Create camera gameplay scene")]
    public static void CreateScene()
    {
        PrepareRuntimeResources();
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        new GameObject("DropZone Camera Gameplay").AddComponent<DropZoneGameplay>();
        System.IO.Directory.CreateDirectory("Assets/Scenes");
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/CameraGameplay.unity");
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene("Assets/Scenes/CameraGameplay.unity", true) };
        PlayerSettings.productName = "DropZone Camera Prototype";
        PlayerSettings.companyName = "DropZone";
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
        PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.Android, "com.dropzone.unityprototype");
        PlayerSettings.iOS.cameraUsageDescription = "DropZone uses the live camera as the gameplay background.";
        AssetDatabase.SaveAssets();
        Debug.Log("DROPZONE_SETUP_OK: scene saved; no player build created.");
    }

    static void PrepareRuntimeResources()
    {
        System.IO.Directory.CreateDirectory("Assets/Resources");
        const string supportPath="Assets/Resources/DropZonePrimitiveSupport.prefab";
        if(AssetDatabase.LoadAssetAtPath<GameObject>(supportPath)==null) {
            var support=new GameObject("Preserved primitive components");support.SetActive(false);
            foreach(var shape in new[]{PrimitiveType.Sphere,PrimitiveType.Cylinder,PrimitiveType.Quad,PrimitiveType.Cube}) {
                var child=GameObject.CreatePrimitive(shape);child.name="Preserve "+shape;child.transform.SetParent(support.transform,false);
            }
            PrefabUtility.SaveAsPrefabAsset(support,supportPath);Object.DestroyImmediate(support);
        }
        foreach(var entry in new[]{new[]{"DropZoneBase","Standard"},new[]{"DropZoneCamera","Unlit/Texture"}}) {
            string path="Assets/Resources/"+entry[0]+".mat";
            if(AssetDatabase.LoadAssetAtPath<Material>(path)==null) {
                var shader=Shader.Find(entry[1]);if(shader==null)throw new System.Exception("Required shader missing: "+entry[1]);
                var material=new Material(shader);if(entry[0]=="DropZoneBase")material.EnableKeyword("_EMISSION");
                AssetDatabase.CreateAsset(material,path);
            }
        }
        string[] names={"DropZonePortrait","DropZoneWeaponIcon","DropZoneControlRing","DropZoneAmmoChip","DropZoneHitMarker"};
        for(int i=0;i<names.Length;i++) {
            string path="Assets/Resources/"+names[i]+".png";
            if(!System.IO.File.Exists(path)) {
                var image=i==0?DropZoneHudArt.Portrait():i==1?DropZoneHudArt.Weapon():i==2?DropZoneHudArt.Ring():i==3?DropZoneHudArt.AmmoChip():DropZoneHudArt.HitMarker();
                System.IO.File.WriteAllBytes(path,image.EncodeToPNG());Object.DestroyImmediate(image);AssetDatabase.ImportAsset(path);
                var importer=(TextureImporter)AssetImporter.GetAtPath(path);importer.mipmapEnabled=false;importer.alphaIsTransparency=true;
                importer.textureCompression=TextureImporterCompression.Uncompressed;importer.SaveAndReimport();
            }
        }
        AssetDatabase.SaveAssets();
    }

    [MenuItem("DropZone/Build browser preview (no APK)")]
    public static void BuildWebPreview()
    {
        CreateScene();
        EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL,BuildTarget.WebGL);
        PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Disabled;
        PlayerSettings.WebGL.dataCaching=false;
        var output=System.IO.Path.GetFullPath("../unity-web-preview/dist");
        var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions {scenes=new[]{"Assets/Scenes/CameraGameplay.unity"},locationPathName=output,target=BuildTarget.WebGL,options=BuildOptions.Development});
        if(report.summary.result!=UnityEditor.Build.Reporting.BuildResult.Succeeded)throw new System.Exception("Unity browser preview build failed");
        Debug.Log("DROPZONE_WEB_PREVIEW_OK: "+output);
    }

    [MenuItem("DropZone/Export Android library (no APK)")]
    public static void ExportAndroid()
    {
        var marker = System.IO.Path.GetFullPath("../dropzone-app/unity-export/dropzone-export.json");
        if(System.IO.File.Exists(marker))System.IO.File.Delete(marker);
        CreateScene();
        EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android);
        PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
        PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
        PlayerSettings.Android.applicationEntry = AndroidApplicationEntry.Activity;
        PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android, false);
        PlayerSettings.SetGraphicsAPIs(BuildTarget.Android, new[] { UnityEngine.Rendering.GraphicsDeviceType.OpenGLES3 });
        EditorUserBuildSettings.exportAsGoogleAndroidProject = true;
        var output = System.IO.Path.GetFullPath("../dropzone-app/unity-export");
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
            scenes = new[] { "Assets/Scenes/CameraGameplay.unity" },
            locationPathName = output, target = BuildTarget.Android,
            options = BuildOptions.AcceptExternalModificationsToPlayer
        });
        if(report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
            throw new System.Exception("Unity Android library export failed: " + report.summary.result);
        System.IO.File.WriteAllText(marker, "{\"editorVersion\":\"6000.5.6f1\",\"abi\":\"arm64-v8a\",\"status\":\"exported\"}");
        Debug.Log("DROPZONE_ANDROID_LIBRARY_OK: " + output + "; no APK built");
    }

    public static void CaptureArtwork()
    {
        EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var root = new GameObject("Artwork QA");
        var gameplay = root.AddComponent<DropZoneGameplay>();
        typeof(DropZoneGameplay).GetMethod("Awake", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic).Invoke(gameplay, null);
        var camera = root.GetComponentInChildren<Camera>();
        var weapon = GameObject.Find("DZ-01 original procedural blaster");
        weapon.transform.localPosition = new Vector3(.16f, -.19f, .36f);
        var texture = new RenderTexture(1280, 720, 24);
        camera.targetTexture = texture; camera.aspect = 1280f / 720;
        camera.Render(); RenderTexture.active = texture;
        var image = new Texture2D(1280, 720, TextureFormat.RGB24, false);
        image.ReadPixels(new Rect(0,0,1280,720),0,0); image.Apply();
        System.IO.File.WriteAllBytes("/private/tmp/dropzone-weapon-qa.png", image.EncodeToPNG());
        camera.targetTexture = null; RenderTexture.active = null;
        Object.DestroyImmediate(image); Object.DestroyImmediate(texture);
        Debug.Log("DROPZONE_ARTWORK_CAPTURE_OK");
    }

    public static void CaptureMotionPoses()
    {
        DropZoneMotionChecks.Run();
        EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
        var root=new GameObject("Pose QA");var gameplay=root.AddComponent<DropZoneGameplay>();
        typeof(DropZoneGameplay).GetMethod("Awake",System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.NonPublic).Invoke(gameplay,null);
        var camera=root.GetComponentInChildren<Camera>();var rig=root.GetComponent<DropZoneWeaponMotion>();
        var target=new RenderTexture(1280,720,24);camera.targetTexture=target;camera.aspect=1280f/720;
        System.IO.Directory.CreateDirectory("Review");
        string[] names={"hip","aim","reload-extract","reload-insert","reload-rack"};
        for(int pose=0;pose<names.Length;pose++) {
            rig.CancelReload();for(int i=0;i<90;i++)rig.Tick(1f/30,Vector3.zero,0,pose==1,false);
            if(pose>=2) {rig.BeginReload();float time=pose==2?.70f:pose==3?1.05f:1.35f;rig.Tick(time,Vector3.zero,0,false,false);}
            camera.fieldOfView=pose==1?48:58;camera.Render();RenderTexture.active=target;
            var image=new Texture2D(1280,720,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,1280,720),0,0);image.Apply();
            System.IO.File.WriteAllBytes("Review/"+names[pose]+".png",image.EncodeToPNG());UnityEngine.Object.DestroyImmediate(image);
        }
        camera.targetTexture=null;RenderTexture.active=null;UnityEngine.Object.DestroyImmediate(target);
        Debug.Log("DROPZONE_POSE_CAPTURE_OK: hip, aim, extraction, insertion, charging-handle reach");
    }

    public static void CaptureMotionFrames()
    {
        DropZoneMotionChecks.Run();
        EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
        var root=new GameObject("Motion review");var gameplay=root.AddComponent<DropZoneGameplay>();
        typeof(DropZoneGameplay).GetMethod("Awake",System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.NonPublic).Invoke(gameplay,null);
        var camera=root.GetComponentInChildren<Camera>();var rig=root.GetComponent<DropZoneWeaponMotion>();
        var effects=root.GetComponent<DropZoneWeaponEffects>();var weapon=GameObject.Find("DZ-01 original procedural blaster").transform;
        var particles=root.GetComponentsInChildren<ParticleSystem>();
        var target=new RenderTexture(960,540,24);camera.targetTexture=target;camera.aspect=960f/540;
        System.IO.Directory.CreateDirectory("Review/frames");
        for(int frame=0;frame<210;frame++) {
            float t=frame/30f;bool aim=t>=1.5f&&t<3;bool sprint=t>=5&&t<6;
            if(frame==96)rig.BeginReload();
            bool shot=frame==66||frame==73||frame==80;if(shot)rig.Shot();
            rig.Tick(1f/30,new Vector3(0,Mathf.Sin(t*2)*.05f,0),t<1.5f||sprint?1:0,aim,sprint);
            camera.fieldOfView=Mathf.Lerp(sprint?64:58,48,rig.AimBlend);
            if(shot)effects.Fire(weapon);effects.Step(1f/30);
            foreach(var system in particles)system.Simulate(1f/30,true,false,false);
            camera.Render();RenderTexture.active=target;
            var image=new Texture2D(960,540,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,960,540),0,0);image.Apply();
            System.IO.File.WriteAllBytes("Review/frames/"+frame.ToString("D4")+".png",image.EncodeToPNG());UnityEngine.Object.DestroyImmediate(image);
        }
        camera.targetTexture=null;RenderTexture.active=null;UnityEngine.Object.DestroyImmediate(target);
        Debug.Log("DROPZONE_MOTION_FRAMES_OK: 210 rendered frames, walk/aim/fire/reload/sprint/idle");
    }

    public static void FinalizeMotionPolish()
    {
        CaptureMotionPoses();
        ExportAndroid();
    }
}
