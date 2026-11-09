using UnityEngine;

public struct DropZoneReloadPose
{
    public Vector3 magazine, leftHand, euler, offset;
    public float openness, bolt;
}

public sealed class DropZoneWeaponMotion : MonoBehaviour
{
    Transform weapon, magazine, bolt;
    DropZoneHands hands;
    float aim, sprint, phase, breath, kick, kickVelocity, roll, rollVelocity, elapsed;
    float duration=1.65f;
    Vector3 sway;
    public bool IsReloading { get; private set; }
    public float AimBlend => aim;
    public float ReloadProgress => IsReloading?Mathf.Clamp01(elapsed/duration):0;

    public void Initialize(Transform model, Transform mag, float reloadDuration)
    { weapon=model;magazine=mag;bolt=model.Find("Charging handle");hands=model.GetComponent<DropZoneHands>();duration=Mathf.Max(.5f,reloadDuration);Tick(0,Vector3.zero,0,false,false); }
    public void Shot()
    { if(IsReloading)return;kick=Mathf.Min(kick+1,2.2f);roll=Mathf.Clamp(roll+.18f,-.7f,.7f);hands.Trigger(); }
    public bool BeginReload()
    { if(IsReloading)return false;IsReloading=true;elapsed=0;return true; }
    public void CancelReload()
    { IsReloading=false;elapsed=0;if(magazine!=null)magazine.localPosition=Vector3.zero;if(hands!=null)hands.ResetPose();Tick(0,Vector3.zero,0,false,false); }

    static void Spring(ref float value,ref float velocity,float rate,float dt)
    { float decay=Mathf.Exp(-rate*dt),change=(velocity+rate*value)*dt;velocity=(velocity-rate*change)*decay;value=(value+change)*decay; }
    static float Ease(float t) { t=Mathf.Clamp01(t);return t*t*(3-2*t); }
    static float Phase(float t,float start,float end) { return Ease((t-start)/(end-start)); }

    public static DropZoneReloadPose EvaluateReload(float t)
    {
        t=Mathf.Clamp01(t);
        float tilt=Phase(t,0,.18f)*(1-Phase(t,.76f,1));
        Vector3 grip=new Vector3(.055f,-.025f,-.13f),outward=new Vector3(-.09f,-.20f,-.09f),insert=new Vector3(.025f,-.08f,-.12f),rack=new Vector3(-.025f,.095f,-.20f);
        Vector3 hand=t<.24f?Vector3.Lerp(Vector3.zero,grip,Phase(t,0,.20f)):
            t<.44f?Vector3.Lerp(grip,outward,Phase(t,.24f,.44f)):
            t<.66f?Vector3.Lerp(outward,insert,Phase(t,.44f,.66f)):
            t<.82f?Vector3.Lerp(insert,rack,Phase(t,.69f,.82f)):
            Vector3.Lerp(rack,Vector3.zero,Phase(t,.82f,1));
        Vector3 dropped=new Vector3(-.145f,-.175f,.04f);
        Vector3 mag=t<.44f?Vector3.Lerp(Vector3.zero,dropped,Phase(t,.24f,.44f)):Vector3.Lerp(dropped,Vector3.zero,Phase(t,.44f,.70f));
        float open=(Phase(t,0,.12f)*(1-Phase(t,.16f,.24f))*.65f+Phase(t,.67f,.78f)*(1-Phase(t,.85f,1))*.55f);
        float slide=Phase(t,.74f,.82f)*(1-Phase(t,.82f,.90f));hand.z-=slide*.035f;
        return new DropZoneReloadPose {magazine=mag,leftHand=hand,openness=open,bolt=slide,euler=new Vector3(8,-62,-22)*tilt,offset=new Vector3(-.10f,.12f,.16f)*tilt};
    }

    public void Tick(float dt,Vector3 angular,float locomotion,bool aimInput,bool sprintInput)
    {
        if(weapon==null)return;
        dt=Mathf.Max(0,dt);
        if(IsReloading) { elapsed+=dt;if(elapsed>=duration)IsReloading=false; }
        aim=Mathf.Lerp(aim,aimInput&&!IsReloading?1:0,1-Mathf.Exp(-dt*14));
        sprint=Mathf.Lerp(sprint,sprintInput&&!aimInput&&!IsReloading?Mathf.Clamp01(locomotion):0,1-Mathf.Exp(-dt*8));
        phase=Mathf.Repeat(phase+dt*Mathf.Lerp(8,13,sprint)*locomotion,Mathf.PI*2);
        breath=Mathf.Repeat(breath+dt*1.6f,Mathf.PI*2);
        sway=Vector3.Lerp(sway,Vector3.ClampMagnitude(angular,.8f),1-Mathf.Exp(-dt*10));
        Spring(ref kick,ref kickVelocity,24,dt);Spring(ref roll,ref rollVelocity,18,dt);
        float bob=(1-aim*.9f)*locomotion*Mathf.Lerp(.006f,.014f,sprint);
        var pose=IsReloading?EvaluateReload(elapsed/duration):default;
        Vector3 breathing=new Vector3(Mathf.Sin(breath)*.0007f,Mathf.Cos(breath)*.001f,0)*(1-aim*.85f);
        weapon.localPosition=Vector3.Lerp(new Vector3(.16f,-.19f,.36f),new Vector3(0,-.125f,.34f),aim)+breathing+pose.offset+
            new Vector3(Mathf.Sin(phase)*bob-sway.y*.018f,Mathf.Cos(phase*2)*bob+sway.x*.012f,-kick*.018f);
        weapon.localRotation=Quaternion.Euler(new Vector3(-kick*5+sway.x*2+sprint*12,-sway.y*3,Mathf.Sin(phase)*bob*160-sprint*12+roll)+pose.euler);
        magazine.localPosition=pose.magazine;if(bolt!=null)bolt.localPosition=new Vector3(0,0,-pose.bolt*.035f);hands.Pose(dt,pose.leftHand,pose.openness);
    }
}
