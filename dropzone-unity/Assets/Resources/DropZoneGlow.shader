Shader "DropZone/AdditiveSoft" {
 Properties { _Color("Color", Color)=(1,.7,.25,1) }
 SubShader { Tags { "Queue"="Transparent" "RenderType"="Transparent" } Blend SrcAlpha One ZWrite Off Cull Off
  Pass { CGPROGRAM
   #pragma vertex vert
   #pragma fragment frag
   #include "UnityCG.cginc"
   struct appdata { float4 vertex:POSITION; float2 uv:TEXCOORD0; float4 color:COLOR; };
   struct v2f { float4 position:SV_POSITION; float2 uv:TEXCOORD0; float4 color:COLOR; };
   float4 _Color;
   v2f vert(appdata v) { v2f o; o.position=UnityObjectToClipPos(v.vertex);o.uv=v.uv;o.color=v.color;return o; }
   fixed4 frag(v2f i):SV_Target { float r=length(i.uv-.5)*2; return fixed4(_Color.rgb*i.color.rgb,saturate(1-r)*_Color.a*i.color.a); }
  ENDCG }
 }
}
