using UnityEngine;

// Reused emitters and shell pool: no Instantiate/Destroy in the firing path.
public sealed class DropZoneWeaponEffects : MonoBehaviour
{
    ParticleSystem flash, smoke;
    readonly Transform[] shells=new Transform[12];
    readonly Vector3[] velocities=new Vector3[12];
    readonly float[] ages=new float[12];
    Material glow, brass; int nextShell;
    public void Initialize(Transform muzzle)
    {
        glow=new Material(Resources.Load<Shader>("DropZoneGlow"));
        brass=DropZoneAssets.Material("Original shell brass",new Color(.73f,.49f,.16f),.85f);
        flash=Emitter("Muzzle flare",muzzle,.045f,.045f,new Color(1,.72f,.22f,1));
        smoke=Emitter("Barrel heat haze",muzzle,.35f,.025f,new Color(.25f,.4f,.48f,.12f));
        for(int i=0;i<shells.Length;i++) {
            var shell=GameObject.CreatePrimitive(PrimitiveType.Cylinder); shell.name="Pooled shell "+i;
            Destroy(shell.GetComponent<Collider>());shell.GetComponent<Renderer>().sharedMaterial=brass;
            shell.transform.SetParent(transform,false);shell.transform.localScale=new Vector3(.008f,.015f,.008f);
            shells[i]=shell.transform;shell.SetActive(false);
        }
    }
    ParticleSystem Emitter(string name,Transform parent,float lifetime,float size,Color color) {
        var go=new GameObject(name);go.transform.SetParent(parent,false);
        var system=go.AddComponent<ParticleSystem>();system.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
        var main=system.main;main.loop=true;main.playOnAwake=false;main.startLifetime=lifetime;main.startSpeed=.25f;main.startSize=size;main.startColor=color;main.maxParticles=32;
        main.simulationSpace=ParticleSystemSimulationSpace.World;
        var emission=system.emission;emission.enabled=false;
        var shape=system.shape;shape.enabled=false;
        var renderer=go.GetComponent<ParticleSystemRenderer>();renderer.sharedMaterial=glow;
        system.Play();return system;
    }
    public void Fire(Transform weapon) {
        flash.Emit(3);smoke.Emit(2);
        int i=nextShell++%shells.Length;ages[i]=0;
        shells[i].position=weapon.TransformPoint(new Vector3(.07f,.015f,.045f));
        shells[i].rotation=weapon.rotation; shells[i].gameObject.SetActive(true);
        velocities[i]=weapon.TransformDirection(new Vector3(Random.Range(.3f,.5f),Random.Range(.15f,.3f),-.1f));
    }
    void Update() { Step(Time.deltaTime); }
    public void Step(float dt) {
        for(int i=0;i<shells.Length;i++)if(shells[i]!=null&&shells[i].gameObject.activeSelf) {
            ages[i]+=dt;
            if(ages[i]>.7f) { shells[i].gameObject.SetActive(false);continue; }
            velocities[i]+=Vector3.down*dt*1.5f;
            shells[i].position+=velocities[i]*dt;shells[i].Rotate(300*dt,170*dt,80*dt);
        }
    }
    void OnDestroy() { if(glow!=null)Destroy(glow);if(brass!=null)Destroy(brass); }
}
