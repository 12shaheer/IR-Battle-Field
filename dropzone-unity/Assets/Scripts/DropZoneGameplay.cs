using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public sealed partial class DropZoneGameplay : MonoBehaviour
{
#if UNITY_WEBGL && !UNITY_EDITOR
    [System.Runtime.InteropServices.DllImport("__Internal")]static extern void DropZoneWebReady();
#endif
    public int magazineSize=30;
    public float roundsPerSecond=7, reloadSeconds=1.65f;
    Camera view; Transform weapon, magazine, muzzle, background;
    Renderer backgroundRenderer; Material cameraMaterial;
    WebCamTexture feed; AudioSource audioSource; AudioClip shotSound, reloadSound, hitSound;
    Light flash; readonly List<Object> owned=new List<Object>();
    DropZoneWeaponEffects effects;
    DropZoneWeaponMotion motionRig;
    DropZoneHud hud;
    bool hudRendered;
    bool gyroscopeAvailable;
    int maxHealth=100,alive;
    float armor=-1;
    string displayName="PLAYER",target="",nextShrinkAt="";
    int ammo, health=100; bool aiming, running, paused;
    bool reloading => motionRig!=null&&motionRig.IsReloading;
    float motion, nextShot, flashUntil, damageUntil;
    Vector3 previousAcceleration;
    string cameraStatus="Camera not started", connectionStatus="Prototype · hardware not connected";
    bool embedded;
    float nextScan;
    Color32[] scanPixels;
    int[] scanArgb;
    Texture2D battleTagTexture; string previousTag;
    [System.Serializable] class GameState { public int health=100, maxHealth=100, ammo, alive; public float armor=-1; public string displayName, battleTagPng, hardwareStatus, hardwareDevice, lockedTarget, nextShrinkAt; public bool ended, eliminated, hasHardware, serverConnected=true,teamMode; public int medkits,teamScore;public float healRemaining;public string medicalMode,medicalError,healQrPng,teamName; }

    void Emit(string type, string value="") {
#if UNITY_ANDROID && !UNITY_EDITOR
        if(embedded) using(var bridge=new AndroidJavaClass("com.dropzone.unity.DropZoneModule")) bridge.CallStatic("emit",type,value);
#endif
    }
    public void ApplyState(string json) {
        try { var state=JsonUtility.FromJson<GameState>(json); if(state==null)return;
            ApplyMedicalState(state);
            if(state.health<health)damageUntil=Time.time+.35f;
            maxHealth=Mathf.Max(1,state.maxHealth);health=Mathf.Clamp(state.health,0,maxHealth);armor=state.armor;alive=state.alive;displayName=state.displayName;target=state.lockedTarget;nextShrinkAt=state.nextShrinkAt; ammo=Mathf.Clamp(state.ammo,0,magazineSize);
            connectionStatus=!state.serverConnected?"SERVER RECONNECTING":state.hasHardware&&state.hardwareStatus!="connected"?(state.hardwareDevice=="RX"?"RECEIVER":state.hardwareDevice=="TX"?"TRANSMITTER":"HARDWARE")+" RECONNECTING":state.displayName+" · DROPZONE";
            if(!string.IsNullOrEmpty(state.battleTagPng)&&state.battleTagPng!=previousTag) {
                var texture=new Texture2D(2,2,TextureFormat.RGBA32,false);texture.filterMode=FilterMode.Point;
                if(texture.LoadImage(System.Convert.FromBase64String(state.battleTagPng))) {
                    if(battleTagTexture!=null)Destroy(battleTagTexture);
        if(healingQrTexture!=null)Destroy(healingQrTexture);battleTagTexture=texture;previousTag=state.battleTagPng;
                } else Destroy(texture);
            }
            if(state.ended||state.eliminated)ExitGameplay("");
        } catch(System.Exception error) { Debug.LogWarning("Invalid game state: "+error.Message); }
    }
    public void PresentShot(string value) { if(MedicalOpen||reloading||health<=0)return;motionRig.Shot();flashUntil=Time.time+.045f;effects.Fire(weapon);audioSource.pitch=Random.Range(.97f,1.03f);audioSource.PlayOneShot(shotSound); }
    public void PresentHit(string value) { ConfirmHit();if(hud!=null){hud.hitUntil=Time.unscaledTime+.16f;if(value=="kill")hud.killUntil=Time.unscaledTime+1.5f;} }
    public void PresentReload(string value) { BeginReload(); }
    public void ExitGameplay(string value) { if(embedded) { if(feed!=null)feed.Stop(); Application.Unload(); } }

    void Awake()
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        try { using(var bridge=new AndroidJavaClass("com.dropzone.unity.DropZoneModule")) embedded=true; } catch(System.Exception) { embedded=false; }
#endif
        // Galaxy S8/A32 baseline: stable frame pacing before higher frame rates.
        Application.targetFrameRate=30; QualitySettings.vSyncCount=0;
        QualitySettings.antiAliasing=0; QualitySettings.shadows=UnityEngine.ShadowQuality.Disable;
        QualitySettings.pixelLightCount=2;
#if !UNITY_WEBGL || UNITY_EDITOR
        Screen.orientation=ScreenOrientation.LandscapeLeft;
#endif
        ammo=magazineSize;
        view=new GameObject("First person camera").AddComponent<Camera>();
        view.transform.SetParent(transform,false); view.nearClipPlane=.01f; view.farClipPlane=30; view.fieldOfView=58;
        view.backgroundColor=new Color(.06f,.10f,.14f); view.clearFlags=CameraClearFlags.SolidColor;
        view.gameObject.AddComponent<AudioListener>();
        hud=gameObject.AddComponent<DropZoneHud>();
        weapon=DropZoneAssets.BuildWeapon(view.transform,out magazine,out muzzle);
        motionRig=gameObject.AddComponent<DropZoneWeaponMotion>();motionRig.Initialize(weapon,magazine,reloadSeconds);
        effects=gameObject.AddComponent<DropZoneWeaponEffects>();effects.Initialize(muzzle);
        var key=new GameObject("Weapon key light").AddComponent<Light>(); key.type=LightType.Directional; key.intensity=1.3f; key.transform.rotation=Quaternion.Euler(35,-30,0); key.transform.SetParent(transform);
        RenderSettings.ambientLight=new Color(.48f,.55f,.65f);
        flash=new GameObject("Muzzle illumination").AddComponent<Light>(); flash.transform.SetParent(muzzle,false); flash.color=new Color(1,.65f,.20f); flash.range=1.5f; flash.intensity=0;
        audioSource=gameObject.AddComponent<AudioSource>(); audioSource.spatialBlend=0;
        shotSound=DropZoneAssets.Sound("Original blaster discharge",.24f,95,true);
        reloadSound=DropZoneAssets.Sound("Original magazine latch",.18f,740,false);
        hitSound=DropZoneAssets.Sound("Original hit confirmation",.12f,1400,false);
        owned.Add(shotSound); owned.Add(reloadSound); owned.Add(hitSound);
#if !UNITY_WEBGL || UNITY_EDITOR
        gyroscopeAvailable=SystemInfo.supportsGyroscope;
        if(gyroscopeAvailable)Input.gyro.enabled=true;
        previousAcceleration=Input.acceleration;
#endif
    }

    IEnumerator Start()
    {
        // Do not acknowledge launch until the gameplay HUD has actually painted.
        yield return new WaitUntil(() => hudRendered);
        if(embedded)Emit("ready");
#if UNITY_WEBGL && !UNITY_EDITOR
        DropZoneWebReady();
#endif
        yield return Application.RequestUserAuthorization(UserAuthorization.WebCam);
        if(!Application.HasUserAuthorization(UserAuthorization.WebCam)) { cameraStatus="Camera permission denied — allow it in system settings"; yield break; }
        var devices=WebCamTexture.devices;
        if(devices.Length==0) { cameraStatus="No camera available — motion and weapon preview still work"; yield break; }
        var chosen=devices[0]; foreach(var device in devices) if(!device.isFrontFacing) { chosen=device; break; }
        feed=new WebCamTexture(chosen.name,1280,720,30); feed.Play(); cameraStatus="Starting live camera…";
        var plane=GameObject.CreatePrimitive(PrimitiveType.Quad); plane.name="Live camera background";
        Destroy(plane.GetComponent<Collider>()); background=plane.transform; background.SetParent(view.transform,false); background.localPosition=new Vector3(0,0,10);
        backgroundRenderer=plane.GetComponent<Renderer>(); cameraMaterial=new Material(Resources.Load<Material>("DropZoneCamera")); cameraMaterial.mainTexture=feed; backgroundRenderer.sharedMaterial=cameraMaterial;
    }

    void Update()
    {
        if(paused) return;
        float dt=Time.deltaTime;
        CheckMedicalTap();
        if(Input.GetKeyDown(KeyCode.R)) Reload();
        aiming=(!Application.isMobilePlatform&&Input.GetMouseButton(1))||aimingTouch;
        running=!aiming&&(Input.GetKey(KeyCode.LeftShift)||runTouch);
        float controlBoundary=Screen.safeArea.yMin+100*(Screen.safeArea.width/1000f);
        bool desktopFire=!Application.isMobilePlatform&&Input.GetMouseButton(0)&&Input.mousePosition.y>controlBoundary;
        if(desktopFire||fireTouch) Fire();
        float sensorMotion=0;
#if !UNITY_WEBGL || UNITY_EDITOR
        sensorMotion=Vector3.Distance(Input.acceleration,previousAcceleration);previousAcceleration=Input.acceleration;
#endif
        float keyboardMotion=Input.GetKey(KeyCode.W)||Input.GetKey(KeyCode.S)||Input.GetKey(KeyCode.A)||Input.GetKey(KeyCode.D)?1:0;
        motion=Mathf.Lerp(motion,Mathf.Clamp01(sensorMotion*8+keyboardMotion),1-Mathf.Exp(-dt*7));
        Vector3 angular=gyroscopeAvailable?Input.gyro.rotationRateUnbiased:new Vector3(-Input.GetAxis("Mouse Y"),Input.GetAxis("Mouse X"),0)*.12f;
        bool wasReloading=reloading;float previousReload=motionRig.ReloadProgress;
        motionRig.Tick(dt,angular,motion,aiming,running);
        if(wasReloading&&previousReload<.70f&&(!reloading||motionRig.ReloadProgress>=.70f)) { audioSource.pitch=1;audioSource.PlayOneShot(reloadSound); }
        if(wasReloading&&previousReload<.86f&&(!reloading||motionRig.ReloadProgress>=.86f)) { audioSource.pitch=1.3f;audioSource.PlayOneShot(reloadSound,.7f); }
        if(wasReloading&&!reloading&&!embedded)ammo=magazineSize;
        view.fieldOfView=Mathf.Lerp(view.fieldOfView,Mathf.Lerp(running?64:58,48,motionRig.AimBlend),1-Mathf.Exp(-dt*10));
        flash.intensity=Time.time<flashUntil?2.5f:0;
        UpdateCameraPlane();
        ScanBattleTags();
        weapon.gameObject.SetActive(!MedicalOpen);
    }

    void ScanBattleTags() {
#if UNITY_ANDROID && !UNITY_EDITOR
        if(!embedded||feed==null||feed.width<=16||!feed.didUpdateThisFrame||Time.time<nextScan)return;
        nextScan=Time.time+.35f;
        scanPixels=feed.GetPixels32(scanPixels);
        int step=2,w=feed.width/step,h=feed.height/step;
        if(scanArgb==null||scanArgb.Length!=w*h)scanArgb=new int[w*h];
        for(int y=0;y<h;y++)for(int x=0;x<w;x++) { int sourceY=feed.videoVerticallyMirrored?y*step:feed.height-1-y*step;
            Color32 p=scanPixels[sourceY*feed.width+x*step]; scanArgb[y*w+x]=unchecked((int)0xff000000)|(p.r<<16)|(p.g<<8)|p.b; }
        using(var scanner=new AndroidJavaClass("com.dropzone.unity.DropZoneScanner"))scanner.CallStatic("scan",scanArgb,w,h,feed.videoRotationAngle);
#endif
    }

    void UpdateCameraPlane()
    {
        if(feed==null||feed.width<=16||background==null) return;
        cameraStatus="LIVE CAMERA";
        int angle=feed.videoRotationAngle; bool quarter=angle%180!=0;
        float aspect=quarter?(float)feed.height/feed.width:(float)feed.width/feed.height;
        float height=2*10*Mathf.Tan(view.fieldOfView*.5f*Mathf.Deg2Rad);
        float width=height*view.aspect;
        if(aspect>view.aspect) width=height*aspect; else height=width/aspect;
        background.localRotation=Quaternion.Euler(0,0,-angle);
        background.localScale=quarter?new Vector3(height,width,1):new Vector3(width,height,1);
        cameraMaterial.mainTextureScale=new Vector2(1,feed.videoVerticallyMirrored?-1:1);
        cameraMaterial.mainTextureOffset=new Vector2(0,feed.videoVerticallyMirrored?1:0);
    }

    public void Fire()
    {
        if(MedicalOpen||paused||reloading||health<=0||ammo<=0||Time.time<nextShot) return;
        if(embedded) { nextShot=Time.time+1/Mathf.Max(1,roundsPerSecond); Emit("fire"); return; }
        nextShot=Time.time+1/Mathf.Max(1,roundsPerSecond);ammo--;PresentShot("");
        // Presentation only: no simulated QR target or backend hit is invented here.
    }
    public void Reload() { if(!MedicalOpen&&!paused&&!reloading&&ammo<magazineSize) { if(embedded)Emit("reload"); else BeginReload(); } }
    void BeginReload()
    {
        if(!motionRig.BeginReload())return;
        audioSource.pitch=1;audioSource.PlayOneShot(reloadSound);
    }
    public void ReceiveDamage(string amount) { if(int.TryParse(amount,out int damage)) { health=Mathf.Clamp(health-Mathf.Max(0,damage),0,100); damageUntil=Time.time+.35f; } }
    public void ConfirmHit() { audioSource.PlayOneShot(hitSound); }
    public void SetConnectionStatus(string status) { connectionStatus=status; }
    bool aimingTouch,runTouch,fireTouch;
    void OnGUI()
    {
        Rect safe=Screen.safeArea; float scale=safe.width/1000f;
        float top=Screen.height-safe.yMax;
        GUI.matrix=Matrix4x4.TRS(new Vector3(safe.x,top,0),Quaternion.identity,new Vector3(scale,scale,1));
        float height=safe.height/scale;
        if(hud==null)return;
        hud.health=health;hud.maxHealth=maxHealth;hud.armor=armor;hud.ammo=ammo;hud.magazineSize=magazineSize;
        hud.displayName=displayName;hud.alive=alive;hud.battleTag=battleTagTexture;hud.reloading=reloading;hud.target=target;
        hud.connection=connectionStatus.Contains("RECONNECTING")?connectionStatus:"";
        hud.zone=teamMode?teamName+" · "+teamScore+" KILLS":"";
        hud.TeamMode=teamMode;
        if(double.TryParse(nextShrinkAt,out double epoch)) {
            int remaining=Mathf.Max(0,(int)((epoch-System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds())/1000));
            hud.zone="ZONE  "+(remaining/60).ToString("D2")+":"+(remaining%60).ToString("D2");
        }
        float centerX=(Screen.width*.5f-safe.x)/scale,centerY=(Screen.height*.5f-top)/scale;
        if(!MedicalOpen) {
            hud.Draw(1000,height,centerX,centerY);
            fireTouch=hud.FireHeld;aimingTouch=hud.AimHeld;runTouch=hud.SprintHeld;
            if(hud.ReloadPressed)Reload();
            if(hud.MedicalPressed)RequestMedical("menu");
            if(teamMode)GUI.Label(new Rect(117,height*.30f-22,230,20),"TAP HEALTH · "+medkits+" FIRST-AID KIT",GUI.skin.label);
        } else {
            fireTouch=false;aimingTouch=false;runTouch=false;
            DrawMedical(1000,height);
        }
        if(Event.current.type==EventType.Repaint){hudRendered=true;DropZoneBootstrap.MarkRendered();}
        if(cameraStatus!="LIVE CAMERA")GUI.Label(new Rect(20,10,380,28),cameraStatus);

        if(Time.time<damageUntil) { GUI.color=new Color(1,.1f,.1f,.5f*(damageUntil-Time.time)/.35f); GUI.DrawTexture(new Rect(0,0,1000,12),Texture2D.whiteTexture); GUI.DrawTexture(new Rect(0,height-12,1000,12),Texture2D.whiteTexture); GUI.DrawTexture(new Rect(0,0,12,height),Texture2D.whiteTexture); GUI.DrawTexture(new Rect(988,0,12,height),Texture2D.whiteTexture); }
        GUI.color=Color.white;
    }
    void OnApplicationPause(bool value) { paused=value; if(value&&MedicalOpen&&medicalMode!="healing")Emit("medical","closed"); if(feed!=null) { if(value)feed.Pause();else feed.Play(); } }
    void OnDisable() { if(motionRig!=null)motionRig.CancelReload(); }
    void OnDestroy()
    {
        if(feed!=null) { feed.Stop(); Destroy(feed); } if(cameraMaterial!=null)Destroy(cameraMaterial);
        if(battleTagTexture!=null)Destroy(battleTagTexture);
        if(healingQrTexture!=null)Destroy(healingQrTexture);
        foreach(var asset in owned)Destroy(asset);
    }
}
