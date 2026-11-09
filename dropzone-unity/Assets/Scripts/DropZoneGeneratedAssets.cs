using UnityEngine;
using System.Collections.Generic;

public sealed class DropZoneGeneratedAssets : MonoBehaviour
{
    readonly HashSet<Object> owned = new HashSet<Object>();
    public void Track(params Object[] assets) { foreach(var asset in assets) if(asset!=null)owned.Add(asset); }
    void OnDestroy() { foreach(var asset in owned) if(asset!=null) { if(Application.isPlaying)Destroy(asset);else DestroyImmediate(asset); } }
}
