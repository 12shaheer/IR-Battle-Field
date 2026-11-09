using UnityEngine;
using System.Collections.Generic;

// Original articulated glove geometry. Each finger has three independently posed joints.
public sealed class DropZoneHands : MonoBehaviour
{
    sealed class Finger { public Transform[] joints; public Quaternion[] rest; public bool trigger, left; }
    readonly List<Finger> fingers = new List<Finger>();
    Transform leftHand;
    Vector3 leftHome;
    float triggerPulse;

    public void Initialize(Material glove, Material armor, Material trim)
    {
        BuildHand("Right", new Vector3(.038f,-.10f,-.025f), 1, glove, armor, trim);
        leftHand = BuildHand("Left", new Vector3(-.048f,-.075f,.27f), -1, glove, armor, trim);
        leftHome = leftHand.localPosition;
    }

    Transform BuildHand(string side, Vector3 location, int sign, Material glove, Material armor, Material trim)
    {
        var hand = new GameObject(side + " articulated glove").transform;
        hand.SetParent(transform, false); hand.localPosition = location;
        Ellipsoid(hand, "Glove palm", Vector3.zero, new Vector3(.052f,.078f,.064f), glove);
        Ellipsoid(hand, "Back-of-hand armor", new Vector3(sign*.022f,0,-.004f), new Vector3(.018f,.06f,.047f), armor);
        Segment(hand,"Tapered sleeve",new Vector3(sign*.012f,-.035f,-.022f),new Vector3(sign*.065f,-.15f,-.145f),.037f,.053f,armor);
        Ellipsoid(hand,"Wrist cuff",new Vector3(sign*.018f,-.05f,-.038f),new Vector3(.067f,.035f,.075f),trim);
        Ellipsoid(hand,"Cuff buckle",new Vector3(sign*.052f,-.05f,-.035f),new Vector3(.012f,.022f,.028f),armor);
        for(int digit=0;digit<5;digit++)
        {
            bool thumb=digit==4;
            var finger = new Finger { joints=new Transform[3], rest=new Quaternion[3], trigger=side=="Right"&&digit==0, left=side=="Left" };
            Transform parent=hand;
            float length=thumb?.019f:Mathf.Lerp(.024f,.018f,digit/3f);
            for(int joint=0;joint<3;joint++)
            {
                var bone=new GameObject(side+" finger "+digit+" joint "+joint).transform;
                bone.SetParent(parent,false);
                bone.localPosition=joint==0?(thumb?new Vector3(-sign*.005f,.038f,-.005f):new Vector3(-sign*.008f,.029f-digit*.018f,.022f)):new Vector3(0,0,length);
                bone.localRotation=Quaternion.Euler(thumb?35:0,sign*(joint==0?-60:-36),0);
                finger.joints[joint]=bone;finger.rest[joint]=bone.localRotation;
                Ellipsoid(bone,"Glove phalanx",new Vector3(0,0,length*.48f),new Vector3(.014f,.015f,length+.006f),glove);
                Ellipsoid(bone,"Knuckle pad",new Vector3(sign*.004f,.005f,.004f),new Vector3(.014f,.008f,.013f),armor);
                parent=bone;
            }
            fingers.Add(finger);
        }
        return hand;
    }

    static void Ellipsoid(Transform parent,string name,Vector3 position,Vector3 size,Material material)
    {
        var go=GameObject.CreatePrimitive(PrimitiveType.Sphere);go.name=name;go.transform.SetParent(parent,false);
        go.transform.localPosition=position;go.transform.localScale=size;
        go.GetComponent<Renderer>().sharedMaterial=material;
        var collider=go.GetComponent<Collider>();collider.enabled=false;Destroy(collider);
    }

    static void Segment(Transform parent,string name,Vector3 start,Vector3 end,float startRadius,float endRadius,Material material)
    {
        const int sides=12; var vertices=new Vector3[sides*2+2];var triangles=new int[sides*12];
        var go=new GameObject(name);go.transform.SetParent(parent,false);go.transform.localPosition=start;
        go.transform.localRotation=Quaternion.FromToRotation(Vector3.forward,end-start);
        float length=(end-start).magnitude;
        for(int ring=0;ring<2;ring++)for(int i=0;i<sides;i++) {float angle=i*Mathf.PI*2/sides;float radius=ring==0?startRadius:endRadius;
            vertices[ring*sides+i]=new Vector3(Mathf.Cos(angle)*radius,Mathf.Sin(angle)*radius,length*ring);
            if(ring==0) {int n=(i+1)%sides,at=i*6;triangles[at]=i;triangles[at+1]=n;triangles[at+2]=i+sides;triangles[at+3]=n;triangles[at+4]=n+sides;triangles[at+5]=i+sides;
                int cap=sides*6+i*3;triangles[cap]=sides*2;triangles[cap+1]=n;triangles[cap+2]=i;
                cap=sides*9+i*3;triangles[cap]=sides*2+1;triangles[cap+1]=i+sides;triangles[cap+2]=n+sides;
            }}
        vertices[sides*2]=Vector3.zero;vertices[sides*2+1]=new Vector3(0,0,length);
        var mesh=new Mesh {name="Original tapered sleeve"};mesh.vertices=vertices;mesh.triangles=triangles;mesh.RecalculateNormals();mesh.RecalculateBounds();
        go.AddComponent<MeshFilter>().sharedMesh=mesh;go.AddComponent<MeshRenderer>().sharedMaterial=material;
        parent.GetComponentInParent<DropZoneGeneratedAssets>().Track(mesh);
    }

    public void Trigger() { triggerPulse=1; }
    public void Pose(float dt, Vector3 leftOffset, float openness)
    {
        triggerPulse=Mathf.Max(0,triggerPulse-dt*8);
        leftHand.localPosition=leftHome+leftOffset;
        leftHand.localRotation=Quaternion.Euler(openness*-12,openness*15,openness*-8);
        foreach(var finger in fingers) for(int i=0;i<3;i++) {
            bool left=finger.left;
            float angle=left?openness*(i==0?35:28):finger.trigger?triggerPulse*(i==0?9:15):0;
            finger.joints[i].localRotation=finger.rest[i]*Quaternion.Euler(0,(left?-1:1)*angle,0);
        }
    }
    public void ResetPose() { Pose(1,Vector3.zero,0); }
}
