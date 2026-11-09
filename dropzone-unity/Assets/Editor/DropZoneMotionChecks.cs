using UnityEngine;
using UnityEditor.SceneManagement;
using System;

public static class DropZoneMotionChecks
{
    static void Require(bool condition,string message) { if(!condition)throw new Exception(message); }
    public static void Run()
    {
        EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
        foreach(int fps in new[]{15,30,60,120})
        {
            var root=new GameObject("Motion validation "+fps);
            Transform magazine,muzzle;var weapon=DropZoneAssets.BuildWeapon(root.transform,out magazine,out muzzle);
            var rig=root.AddComponent<DropZoneWeaponMotion>();rig.Initialize(weapon,magazine,1.65f);
            int joints=0;foreach(var bone in weapon.GetComponentsInChildren<Transform>())if(bone.name.Contains(" joint "))joints++;
            Require(joints==30,"Expected thirty articulated finger joints");
            Require(weapon.GetComponentsInChildren<MeshRenderer>().Length<120,"Weapon draw-call budget exceeded");
            float dt=1f/fps;
            for(int i=0;i<fps*2;i++)rig.Tick(dt,Vector3.zero,0,true,false);
            Require(rig.AimBlend>.999f,"ADS did not settle at "+fps+" FPS");
            float restingZ=weapon.localPosition.z;
            rig.Shot();rig.Tick(dt,Vector3.zero,0,true,false);
            Require(weapon.localPosition.z<restingZ-.001f,"Recoil is missing at "+fps+" FPS");
            for(int i=0;i<fps*2;i++)rig.Tick(dt,Vector3.zero,0,true,false);
            Require(Mathf.Abs(weapon.localPosition.z-restingZ)<.0001f,"Recoil failed to settle at "+fps+" FPS");
            Require(rig.BeginReload(),"Reload did not start");Require(!rig.BeginReload(),"Duplicate reload was accepted");
            for(int i=0;i<Mathf.CeilToInt(.8f*fps);i++)rig.Tick(dt,Vector3.zero,0,true,false);
            Require(magazine.localPosition.magnitude>.04f,"Magazine was not extracted");
            rig.CancelReload();Require(magazine.localPosition==Vector3.zero,"Cancellation left magazine displaced");
            Require((weapon.Find("Left articulated glove").localPosition-new Vector3(-.048f,-.075f,.27f)).magnitude<.0001f,"Cancellation left support hand displaced");
            rig.BeginReload();for(int i=0;i<fps*3;i++)rig.Tick(dt,Vector3.zero,0,true,false);
            Require(!rig.IsReloading&&magazine.localPosition==Vector3.zero,"Reload did not complete at "+fps+" FPS");
            Require(rig.AimBlend>.999f,"ADS did not recover after reload");
            UnityEngine.Object.DestroyImmediate(root);
        }
        foreach(float boundary in new[]{0,.12f,.18f,.20f,.24f,.44f,.66f,.69f,.70f,.76f,.78f,.82f,.85f,1}) {
            var a=DropZoneWeaponMotion.EvaluateReload(boundary-.0001f);var b=DropZoneWeaponMotion.EvaluateReload(boundary+.0001f);
            Require((a.leftHand-b.leftHand).magnitude<.002f,"Support hand snaps at reload phase "+boundary);
            Require((a.magazine-b.magazine).magnitude<.002f,"Magazine snaps at reload phase "+boundary);
        }
        var start=DropZoneWeaponMotion.EvaluateReload(0);var end=DropZoneWeaponMotion.EvaluateReload(1);
        Require(start.leftHand==Vector3.zero&&end.leftHand==Vector3.zero&&end.magazine==Vector3.zero,"Reload endpoints are not neutral");
        Debug.Log("DROPZONE_MOTION_CHECKS_OK: articulated geometry, renderer budget, ADS, recoil, reload, cancellation, continuity; 15/30/60/120 FPS");
    }
}
