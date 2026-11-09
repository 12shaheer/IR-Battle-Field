using UnityEngine;

public sealed class DropZoneHud : MonoBehaviour
{
    public int health=100,maxHealth=100,ammo=30,magazineSize=30,alive=0;
    public float armor=-1,hitUntil,killUntil;
    public string displayName="PLAYER",connection="",zone="",target="";
    public bool reloading,FireHeld,AimHeld,SprintHeld;
    public Texture2D battleTag;
    public bool ReloadPressed,MedicalPressed,TeamMode;
    Texture2D portrait,weapon,ring,chip,hitMarker;
    GUIStyle text,number,small,center,button;
    readonly Color cyan=new Color(.22f,.85f,.94f),panel=new Color(.055f,.085f,.14f,.78f);
    void Prepare() {
        if(text!=null)return;
        portrait=Resources.Load<Texture2D>("DropZonePortrait");weapon=Resources.Load<Texture2D>("DropZoneWeaponIcon");ring=Resources.Load<Texture2D>("DropZoneControlRing");
        chip=Resources.Load<Texture2D>("DropZoneAmmoChip");hitMarker=Resources.Load<Texture2D>("DropZoneHitMarker");
        var font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        text=new GUIStyle(GUI.skin.label){font=font,fontSize=14};text.normal.textColor=Color.white;
        number=new GUIStyle(text){fontSize=24,fontStyle=FontStyle.Bold};small=new GUIStyle(text){fontSize=10};
        center=new GUIStyle(text){alignment=TextAnchor.MiddleCenter};button=new GUIStyle(GUI.skin.button){font=font,fontSize=12};
    }
    static void Fill(Rect rect,Color color) { GUI.color=color;GUI.DrawTexture(rect,Texture2D.whiteTexture);GUI.color=Color.white; }
    static void Line(Vector2 a,Vector2 b,Color color,float thickness=2) {
        Matrix4x4 saved=GUI.matrix;GUIUtility.RotateAroundPivot(Mathf.Atan2(b.y-a.y,b.x-a.x)*Mathf.Rad2Deg,a);
        Fill(new Rect(a.x,a.y-thickness/2,(b-a).magnitude,thickness),color);GUI.matrix=saved;
    }
    public void Draw(float width,float height,float cx,float cy) {
        Prepare();GUI.color=Color.white;ReloadPressed=false;MedicalPressed=false;
        float left=16,top=height*.30f;
        Fill(new Rect(left,top,94,116),cyan);Fill(new Rect(left+3,top+3,88,110),panel);
        if(portrait!=null)GUI.DrawTexture(new Rect(left+3,top+3,88,110),portrait);
        GUI.Label(new Rect(left+101,top-3,230,32),health+"/"+maxHealth,number);
        Fill(new Rect(left+101,top+30,230,18),panel);
        float fraction=Mathf.Clamp01(health/(float)Mathf.Max(1,maxHealth));
        for(int i=0;i<36;i++)Fill(new Rect(left+104+i*6.2f,top+33,4.5f,12),new Color(fraction<=.25f?1:cyan.r,fraction<=.25f?.3f:cyan.g,fraction<=.25f?.35f:cyan.b,i<Mathf.CeilToInt(fraction*36)?1:.14f));
        if(TeamMode)MedicalPressed=GUI.Button(new Rect(left+101,top-3,230,52),GUIContent.none,GUIStyle.none);
        Fill(new Rect(left+101,top+53,124,34),panel);GUI.Label(new Rect(left+106,top+53,45,17),armor<0?"—":Mathf.RoundToInt(armor)+"%",small);
        Fill(new Rect(left+106,top+73,42,8),Color.white);
        for(int i=0;i<20;i++)Fill(new Rect(left+159+(i%10)*5,top+58+(i/10)*12,3,9),new Color(cyan.r,cyan.g,cyan.b,armor>=0&&i<armor/5?1:.18f));
        Fill(new Rect(left+101,top+92,160,24),panel);GUI.Label(new Rect(left+109,top+94,146,22),displayName,text);
        float right=width-268,weaponTop=height*.14f;
        Fill(new Rect(right,weaponTop,252,82),panel);if(weapon!=null)GUI.DrawTexture(new Rect(right+8,weaponTop+1,236,66),weapon,ScaleMode.ScaleToFit);
        int filled=Mathf.CeilToInt(Mathf.Clamp01(ammo/(float)Mathf.Max(1,magazineSize))*16);
        for(int i=0;i<16;i++) { GUI.color=new Color(cyan.r,cyan.g,cyan.b,i<filled?1:.16f);GUI.DrawTexture(new Rect(right+14+i*6,weaponTop+64,7,15),chip!=null?chip:Texture2D.whiteTexture); }GUI.color=Color.white;
        if(reloading)GUI.Label(new Rect(right,weaponTop+86,252,22),"RELOADING",center);
        GUI.Label(new Rect(width/2-80,10,160,24),alive>0?alive+" REMAINING":"DROPZONE",center);
        GUI.Label(new Rect(width/2-100,34,200,22),zone,center);
        if(!string.IsNullOrEmpty(connection)){Fill(new Rect(width/2-165,60,330,24),panel);GUI.Label(new Rect(width/2-160,61,320,22),connection,center);}
        Fill(new Rect(cx-2,cy-1,4,2),cyan);Fill(new Rect(cx-1,cy-2,2,4),cyan);
        if(Time.unscaledTime<hitUntil&&hitMarker!=null){GUI.color=Time.unscaledTime<killUntil?new Color(1,.35f,.3f):Color.white;GUI.DrawTexture(new Rect(cx-16,cy-16,32,32),hitMarker);GUI.color=Color.white;}
        if(Time.unscaledTime<killUntil)GUI.Label(new Rect(cx-140,cy+28,280,26),"ELIMINATION CONFIRMED",center);
        if(!string.IsNullOrEmpty(target))GUI.Label(new Rect(cx-150,cy+52,300,26),"TARGET LOCKED · "+target,center);
        Rect fire=new Rect(width/2-48,height-126,96,96);if(ring!=null)GUI.DrawTexture(fire,ring);
        GUI.Label(new Rect(fire.x,fire.y+28,96,36),ammo<=0?"RELOAD":"FIRE",center);
        FireHeld=GUI.RepeatButton(fire,GUIContent.none,GUIStyle.none);
        GUI.Label(new Rect(fire.x-20,fire.y+98,136,22),"EQUIPMENT",center);
        AimHeld=GUI.Toggle(new Rect(width/2+150,height-60,80,40),AimHeld,"AIM",button);
        SprintHeld=GUI.Toggle(new Rect(width/2-170,height-60,80,40),SprintHeld,"SPRINT",button);
        ReloadPressed=GUI.Button(new Rect(width/2+246,height-60,110,40),"RELOAD",button)||(FireHeld&&ammo<=0);
        if(battleTag!=null) {GUI.DrawTexture(new Rect(width-116,height-116,96,96),battleTag,ScaleMode.ScaleToFit);GUI.Label(new Rect(width-116,height-20,96,20),"BATTLE TAG",small);}
    }
}
