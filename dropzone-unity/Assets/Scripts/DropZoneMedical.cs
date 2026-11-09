using UnityEngine;

// Team first-aid presentation. The server owns identity, tokens, the five-second
// lock, damage, kit consumption and healing completion. No local health grants.
public sealed partial class DropZoneGameplay
{
    bool teamMode,medicalConnected=true;
    int medkits,teamScore;
    string teamName="",medicalMode="closed",medicalError="",previousHealingPng;
    float healRemaining,healUpdated,nextMedicalAction;
    Texture2D healingQrTexture;
    GUIStyle medicalTitle,medicalText,medicalCounter,medicalButton;
    bool MedicalOpen => teamMode&&medicalMode!="closed";
    void ApplyMedicalState(GameState state) {
        teamMode=state.teamMode;teamName=state.teamName??"";teamScore=state.teamScore;medkits=state.medkits;
        medicalMode=state.medicalMode??"closed";medicalError=state.medicalError??"";medicalConnected=state.serverConnected;
        healRemaining=state.healRemaining;healUpdated=Time.unscaledTime;
        if(state.healQrPng!=previousHealingPng) {
            if(healingQrTexture!=null)Destroy(healingQrTexture);healingQrTexture=null;previousHealingPng=state.healQrPng;
            if(!string.IsNullOrEmpty(state.healQrPng)) {
                var image=new Texture2D(2,2,TextureFormat.RGBA32,false);image.filterMode=FilterMode.Point;
                if(image.LoadImage(System.Convert.FromBase64String(state.healQrPng)))healingQrTexture=image;else Destroy(image);
            }
        }
    }
    void CheckMedicalTap() {
        if(!teamMode||MedicalOpen||health<=0||!Input.GetMouseButtonDown(0))return;
        Rect safe=Screen.safeArea;float scale=safe.width/1000f,height=safe.height/scale;
        var point=new Vector2((Input.mousePosition.x-safe.x)/scale,(safe.yMax-Input.mousePosition.y)/scale);
        if(new Rect(117,height*.30f-3,230,52).Contains(point))RequestMedical("menu");
    }
    void RequestMedical(string action) {
        if(!teamMode||health<=0||medicalMode=="healing"||Time.unscaledTime<nextMedicalAction)return;
        nextMedicalAction=Time.unscaledTime+.25f;medicalError="";
        if(action!="closed")medicalMode=action;
        fireTouch=false;aimingTouch=false;runTouch=false;
        Emit("medical",action);
    }
    void PrepareMedicalStyles() {
        if(medicalTitle!=null)return;
        var font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        medicalTitle=new GUIStyle(GUI.skin.label){font=font,fontSize=24,fontStyle=FontStyle.Bold,alignment=TextAnchor.MiddleCenter};
        medicalTitle.normal.textColor=Color.white;
        medicalText=new GUIStyle(medicalTitle){fontSize=14,fontStyle=FontStyle.Normal,wordWrap=true};
        medicalText.normal.textColor=new Color(.8f,.8f,.86f);
        medicalCounter=new GUIStyle(medicalTitle){fontSize=74};medicalCounter.normal.textColor=new Color(.87f,1,0);
        medicalButton=new GUIStyle(GUI.skin.button){font=font,fontSize=18,fontStyle=FontStyle.Bold};
    }
    void MedicalFill(Rect rect,Color color) {GUI.color=color;GUI.DrawTexture(rect,Texture2D.whiteTexture);GUI.color=Color.white;}
    void DrawMedical(float width,float height) {
        PrepareMedicalStyles();
        bool scan=medicalMode=="scan",locked=medicalMode=="healing";
        if(scan) {
            MedicalFill(new Rect(0,0,width,82),new Color(.04f,.04f,.07f,.94f));
            MedicalFill(new Rect(0,height-105,width,105),new Color(.04f,.04f,.07f,.94f));
        } else MedicalFill(new Rect(0,0,width,height),new Color(.04f,.04f,.07f,.97f));
        GUI.Label(new Rect(24,16,220,36),"FIRST AID",medicalTitle);
        GUI.Label(new Rect(width-320,18,220,30),health+" / "+maxHealth+" HP",medicalText);
        if(!locked&&GUI.Button(new Rect(width-80,14,52,40),"X",medicalButton))RequestMedical("closed");
        if(medicalMode=="menu") {
            GUI.Label(new Rect(100,height*.22f,width-200,42),"WATCH EACH OTHER'S BACK",medicalTitle);
            GUI.Label(new Rect(100,height*.22f+44,width-200,30),"You can take damage. Shooting is disabled.",medicalText);
            GUI.enabled=health<maxHealth&&medicalConnected;
            if(GUI.Button(new Rect(width/2-300,height*.5f,280,58),"RECEIVE HEALING",medicalButton))RequestMedical("receive");
            GUI.enabled=medkits>0&&medicalConnected;
            if(GUI.Button(new Rect(width/2+20,height*.5f,280,58),"HEAL TEAMMATE",medicalButton))RequestMedical("scan");
            GUI.enabled=true;GUI.Label(new Rect(width/2+20,height*.5f+66,280,30),medkits+" KIT REMAINING",medicalText);
        } else if(medicalMode=="receive") {
            float size=Mathf.Min(245,height-175);
            GUI.Label(new Rect(100,64,width-200,32),"LET A TEAMMATE SCAN YOUR QR",medicalTitle);
            if(healingQrTexture!=null)GUI.DrawTexture(new Rect((width-size)/2,105,size,size),healingQrTexture,ScaleMode.ScaleToFit);
            else GUI.Label(new Rect(100,120,width-200,45),"Generating a fresh healing QR...",medicalText);
            GUI.Label(new Rect(100,height-58,width-240,34),"Only valid while this screen is open. You can still take damage.",medicalText);
        } else if(scan) {
            GUI.Label(new Rect(130,90,width-260,36),"SCAN A TEAMMATE'S HEALING QR",medicalTitle);
            GUI.Label(new Rect(100,height-94,width-240,60),"A valid scan locks both players here for five seconds.\nMovement is allowed. Shooting is disabled.",medicalText);
        } else if(locked) {
            GUI.Label(new Rect(100,height*.24f,width-200,40),"HEALING IN PROGRESS",medicalTitle);
            float remaining=Mathf.Max(0,healRemaining-(Time.unscaledTime-healUpdated));
            GUI.Label(new Rect(width/2-100,height*.34f,200,110),Mathf.CeilToInt(remaining).ToString(),medicalCounter);
            GUI.Label(new Rect(100,height*.65f,width-200,48),"Stay alive. You can move, but cannot shoot.\nThe first-aid kit is used only when healing completes.",medicalText);
        }
        if(!string.IsNullOrEmpty(medicalError))GUI.Label(new Rect(100,height-100,width-240,40),medicalError,medicalText);
        // Keep the ordinary battle tag exposed so QR-only opponents can still hit.
        if(battleTagTexture!=null)GUI.DrawTexture(new Rect(width-112,height-112,88,88),battleTagTexture,ScaleMode.ScaleToFit);
    }
}
