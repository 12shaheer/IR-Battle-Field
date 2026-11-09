using UnityEngine;
using System.Collections.Generic;

// Original procedural geometry and synthesized sounds. No external asset downloads.
public static class DropZoneAssets
{
    public static Material Material(string name, Color color, float metallic = 0f)
    {
        var template=Resources.Load<Material>("DropZoneBase");
        var m = template!=null?new Material(template):new Material(Shader.Find("Standard"));
        m.name=name;m.color=color;
        m.SetFloat("_Metallic", metallic); m.SetFloat("_Glossiness", .45f);
        return m;
    }

    static Transform Part(Transform parent, string name, Vector3 position, Vector3 size, Material material, Vector3 rotation = default)
    {
        var go = new GameObject(name);
        go.name = name; go.transform.SetParent(parent, false);
        go.transform.localPosition = position;
        go.transform.localEulerAngles = rotation;
        var mesh=BeveledBox(size);
        go.AddComponent<MeshFilter>().sharedMesh = mesh;
        parent.GetComponentInParent<DropZoneGeneratedAssets>().Track(mesh);
        go.AddComponent<MeshRenderer>().sharedMaterial = material;
        return go.transform;
    }

    // Rounded edge geometry catches highlights instead of showing raw cube edges.
    static Mesh BeveledBox(Vector3 size) {
        var vertices=new List<Vector3>(); var normals=new List<Vector3>(); var triangles=new List<int>();
        float radius=Mathf.Min(size.x,Mathf.Min(size.y,size.z))*.18f;
        Vector3 inner=size*.5f-Vector3.one*radius;
        Vector3[] faces={Vector3.right,Vector3.left,Vector3.up,Vector3.down,Vector3.forward,Vector3.back};
        foreach(var normal in faces) {
            Vector3 axisA=new Vector3(normal.y,normal.z,normal.x),axisB=Vector3.Cross(normal,axisA);
            int start=vertices.Count; const int grid=4;
            for(int y=0;y<=grid;y++)for(int x=0;x<=grid;x++) {
                Vector3 cube=normal+axisA*(x/(float)grid*2-1)+axisB*(y/(float)grid*2-1);
                Vector3 p=Vector3.Scale(cube,size*.5f),nearest=new Vector3(Mathf.Clamp(p.x,-inner.x,inner.x),Mathf.Clamp(p.y,-inner.y,inner.y),Mathf.Clamp(p.z,-inner.z,inner.z));
                Vector3 n=(p-nearest).normalized;vertices.Add(nearest+n*radius);normals.Add(n);
                if(x<grid&&y<grid) { int i=start+y*(grid+1)+x;triangles.Add(i);triangles.Add(i+1);triangles.Add(i+grid+2);triangles.Add(i);triangles.Add(i+grid+2);triangles.Add(i+grid+1); }
            }
        }
        var mesh=new Mesh { name="Original beveled hard-surface part" };mesh.SetVertices(vertices);mesh.SetNormals(normals);mesh.SetTriangles(triangles,0);mesh.RecalculateBounds();return mesh;
    }

    public static Transform BuildWeapon(Transform parent, out Transform magazine, out Transform muzzle)
    {
        var root = new GameObject("DZ-01 original procedural blaster").transform;
        root.SetParent(parent, false);
        var generated=root.gameObject.AddComponent<DropZoneGeneratedAssets>();
        var body=new GameObject("Static weapon body").transform;body.SetParent(root,false);
        var graphite = Material("Graphite ceramic", new Color(.075f, .10f, .13f), .7f);
        var steel = Material("Machined steel", new Color(.25f, .31f, .34f), .85f);
        var yellow = Material("Safety yellow", new Color(.98f, .65f, .035f), .35f);
        var rubber = Material("Glove and grip", new Color(.035f, .045f, .055f));
        var cyan = Material("Cyan indicators", new Color(.10f, .85f, .95f));
        cyan.EnableKeyword("_EMISSION"); cyan.SetColor("_EmissionColor", new Color(.1f, .8f, 1f) * 2);
        Part(body,"Receiver",new Vector3(0,0,.08f),new Vector3(.095f,.10f,.29f),graphite);
        Part(body,"Upper rail",new Vector3(0,.06f,.10f),new Vector3(.065f,.025f,.30f),steel);
        Part(body,"Fore-end",new Vector3(0,-.015f,.29f),new Vector3(.085f,.09f,.16f),graphite);
        Part(body,"Barrel",new Vector3(0,.005f,.415f),new Vector3(.035f,.035f,.16f),steel);
        Part(body,"Muzzle brake",new Vector3(0,.005f,.50f),new Vector3(.055f,.055f,.04f),graphite);
        Part(body,"Grip",new Vector3(0,-.10f,-.02f),new Vector3(.06f,.15f,.07f),rubber,new Vector3(-16,0,0));
        Part(body,"Trigger guard lower",new Vector3(0,-.11f,.045f),new Vector3(.04f,.009f,.075f),steel);
        Part(body,"Trigger guard front",new Vector3(0,-.083f,.08f),new Vector3(.04f,.055f,.009f),steel);
        Part(body,"Stock",new Vector3(0,-.01f,-.18f),new Vector3(.07f,.09f,.20f),graphite);
        Part(body,"Stock shoulder",new Vector3(0,-.04f,-.28f),new Vector3(.085f,.15f,.025f),yellow);
        Part(body,"Side armor left",new Vector3(-.052f,0,.08f),new Vector3(.012f,.065f,.20f),yellow);
        Part(body,"Side armor right",new Vector3(.052f,0,.08f),new Vector3(.012f,.065f,.20f),yellow);
        for(int i=0;i<8;i++) Part(body,"Rail tooth "+i,new Vector3(0,.08f,.01f+i*.029f),new Vector3(.075f,.012f,.012f),graphite);
        for(int i=0;i<5;i++) Part(body,"Cooling vent "+i,new Vector3(.045f,.015f,.245f+i*.022f),new Vector3(.005f,.035f,.009f),steel);
        // Open reflex frame: aiming lines up its center with the camera forward axis.
        Part(body,"Sight left",new Vector3(-.035f,.12f,.02f),new Vector3(.012f,.085f,.025f),yellow);
        Part(body,"Sight right",new Vector3(.035f,.12f,.02f),new Vector3(.012f,.085f,.025f),yellow);
        Part(body,"Sight top",new Vector3(0,.16f,.02f),new Vector3(.075f,.012f,.025f),yellow);
        Part(body,"Sight base",new Vector3(0,.085f,.02f),new Vector3(.08f,.012f,.045f),graphite);
        Part(body,"Status indicator",new Vector3(.060f,.02f,.035f),new Vector3(.004f,.009f,.045f),cyan);
        for(int side=-1;side<=1;side+=2)for(int i=0;i<3;i++) {
            Part(body,"Receiver fastener",new Vector3(side*.061f,-.018f,.025f+i*.055f),new Vector3(.007f,.012f,.012f),steel,new Vector3(45,0,0));
        }
        magazine = new GameObject("Animated magazine").transform; magazine.SetParent(root,false);
        Part(magazine,"Magazine",new Vector3(0,-.12f,.11f),new Vector3(.065f,.17f,.085f),steel,new Vector3(-8,0,0));
        Part(magazine,"Magazine base",new Vector3(0,-.205f,.12f),new Vector3(.075f,.025f,.09f),yellow);
        var hands=root.gameObject.AddComponent<DropZoneHands>();hands.Initialize(rubber,graphite,yellow);
        var bolt=new GameObject("Charging handle").transform;bolt.SetParent(root,false);
        Part(bolt,"Charging lever",new Vector3(-.055f,.04f,.07f),new Vector3(.026f,.014f,.055f),steel);
        generated.Track(graphite,steel,yellow,rubber,cyan);
        OptimizeStatic(body);OptimizeStatic(magazine);
        muzzle=new GameObject("Muzzle flash origin").transform; muzzle.SetParent(root,false); muzzle.localPosition=new Vector3(0,.005f,.53f);
        return root;
    }


    static void OptimizeStatic(Transform group)
    {
        var groups=new Dictionary<Material,List<CombineInstance>>();
        var originals=group.GetComponentsInChildren<MeshFilter>();
        foreach(var filter in originals) {
            var material=filter.GetComponent<Renderer>().sharedMaterial;
            if(!groups.ContainsKey(material))groups[material]=new List<CombineInstance>();
            groups[material].Add(new CombineInstance {mesh=filter.sharedMesh,transform=group.worldToLocalMatrix*filter.transform.localToWorldMatrix});
        }
        foreach(var pair in groups) {
            var go=new GameObject("Batched "+pair.Key.name);go.transform.SetParent(group,false);
            var mesh=new Mesh {name="Batched original weapon geometry"};mesh.CombineMeshes(pair.Value.ToArray());
            go.AddComponent<MeshFilter>().sharedMesh=mesh;go.AddComponent<MeshRenderer>().sharedMaterial=pair.Key;
            group.GetComponentInParent<DropZoneGeneratedAssets>().Track(mesh);
        }
        foreach(var original in originals) {
            original.gameObject.SetActive(false);
            if(Application.isPlaying)Object.Destroy(original.gameObject);else Object.DestroyImmediate(original.gameObject);
        }
    }

    public static AudioClip Sound(string name, float duration, float pitch, bool shot)
    {
        const int rate=22050;
        var data=new float[Mathf.CeilToInt(duration*rate)]; uint seed=8127;
        for(int i=0;i<data.Length;i++) {
            float t=(float)i/rate, envelope=Mathf.Exp(-t*(shot?30:17));
            seed=1664525*seed+1013904223; float noise=(seed/(float)uint.MaxValue)*2-1;
            data[i]=(noise*(shot?.65f:.2f)+Mathf.Sin(2*Mathf.PI*pitch*t)*.35f)*envelope*.55f;
        }
        var clip=AudioClip.Create(name,data.Length,1,rate,false); clip.SetData(data,0); return clip;
    }
}
