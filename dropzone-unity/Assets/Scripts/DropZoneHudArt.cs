using UnityEngine;

// Rasterized from the project's code-drawn HUD artwork; no external artwork service.
public static class DropZoneHudArt
{
    static bool Polygon(float x,float y,params float[] points) {
        bool inside=false;int count=points.Length/2;
        for(int i=0,j=count-1;i<count;j=i++)if((points[i*2+1]>y)!=(points[j*2+1]>y)&&x<(points[j*2]-points[i*2])*(y-points[i*2+1])/(points[j*2+1]-points[i*2+1])+points[i*2])inside=!inside;
        return inside;
    }
    static Texture2D Make(int width,int height,System.Func<float,float,Color> paint,float sourceWidth,float sourceHeight) {
        var texture=new Texture2D(width,height,TextureFormat.RGBA32,false);var colors=new Color[width*height];
        for(int y=0;y<height;y++)for(int x=0;x<width;x++)colors[(height-1-y)*width+x]=paint(x*sourceWidth/width,y*sourceHeight/height);
        texture.SetPixels(colors);texture.Apply();return texture;
    }
    public static Texture2D Portrait() { return Make(200,240,(x,y)=>{
        Color color=new Color(.07f,.1f,.17f,1);
        if(Polygon(x,y,5,120,14,84,31,72,69,72,86,84,96,120))color=new Color(.96f,.55f,.42f);
        if(y>88&&y<112&&x>28&&x<72)color=new Color(1,.78f,.60f);
        if(y>94&&y<102&&x>34&&x<66)color=new Color(.55f,.30f,.35f);
        if(Polygon(x,y,23,39,15,8,27,28)||Polygon(x,y,77,39,85,8,73,28))color=new Color(.98f,.67f,.57f);
        if((x-50)*(x-50)/(34*34)+(y-53)*(y-53)/(38*38)<1)color=new Color(.96f,.69f,.60f);
        if(Polygon(x,y,22,43,35,29,65,29,78,43,74,64,50,79,26,64))color=Color.Lerp(new Color(.80f,.36f,.52f),new Color(.08f,.14f,.26f),Mathf.Clamp01((y-30)/48));
        if(y>31&&y<50&&Mathf.Abs(Mathf.Abs(x-50)-(50-y))<2)color=new Color(1,.88f,.8f);
        return color;
    },100,120); }
    public static Texture2D Weapon() { return Make(520,160,(x,y)=>{
        bool shape=Polygon(x,y,12,20,17,16,74,16,83,22,106,22,112,27,219,27,219,22,229,22,229,42,218,42,218,35,110,35,100,42,70,42,64,37,19,37,12,32)
            ||Polygon(x,y,216,31,231,29,247,57,237,63,222,40)||Polygon(x,y,91,38,107,40,93,63,80,58)
            ||Polygon(x,y,66,37,93,37,93,48,85,53,74,53,66,45)||(x>26&&x<70&&y>14&&y<19);
        if(Polygon(x,y,72,40,88,40,88,44,84,48,76,48,72,45))shape=false;
        return shape?Color.white:Color.clear;
    },260,80); }
    public static Texture2D Ring() { return Make(192,192,(x,y)=>{
        float r=Vector2.Distance(new Vector2(x,y),new Vector2(48,48));
        float alpha=Mathf.Clamp01(1-Mathf.Abs(r-42)/5)*.8f+Mathf.Clamp01(1-Mathf.Abs(r-42)/1.2f);
        return new Color(.25f,.88f,1,Mathf.Clamp01(alpha));
    },96,96); }
    public static Texture2D AmmoChip() {return Make(12,32,(x,y)=>x>y*.20f&&x<y*.20f+5?Color.white:Color.clear,12,16);}
    public static Texture2D HitMarker() {return Make(48,48,(x,y)=>{
        float dx=Mathf.Abs(x-16),dy=Mathf.Abs(y-16);return Mathf.Max(dx,dy)>5&&Mathf.Max(dx,dy)<14&&Mathf.Abs(dx-dy)<1.4f?Color.white:Color.clear;
    },32,32);}
}
