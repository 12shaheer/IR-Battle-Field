package com.dropzone.unity;
import android.graphics.Bitmap;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import java.util.concurrent.atomic.AtomicBoolean;

public final class DropZoneScanner {
  private static final AtomicBoolean busy = new AtomicBoolean(false);
  private static BarcodeScanner scanner;
  public static void scan(int[] pixels, int width, int height, int rotation) {
    if (!busy.compareAndSet(false, true)) return;
    try {
      if (scanner == null) scanner = BarcodeScanning.getClient(new BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build());
      Bitmap bitmap = Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888);
      scanner.process(InputImage.fromBitmap(bitmap, rotation))
        .addOnSuccessListener(codes -> {
          float frameWidth = rotation % 180 == 0 ? width : height;
          float frameHeight = rotation % 180 == 0 ? height : width;
          float nearest = Float.MAX_VALUE; String target = null;
          for (Barcode code : codes) {
            String text = code.getRawValue(); android.graphics.Rect bounds = code.getBoundingBox();
            if (text == null || !(text.startsWith("DZ:") || text.startsWith("DZHEAL:")) || bounds == null) continue;
            float dx = (bounds.exactCenterX() - frameWidth / 2) / frameWidth;
            float dy = (bounds.exactCenterY() - frameHeight / 2) / frameHeight;
            float distance = dx * dx + dy * dy;
            if (Math.abs(dx) <= .18f && Math.abs(dy) <= .18f && distance < nearest) { nearest = distance; target = text; }
          }
          if (target != null) DropZoneModule.emit("qr", target);
        })
        .addOnFailureListener(error -> DropZoneModule.emit("scannerError", error.getMessage()))
        .addOnCompleteListener(task -> { bitmap.recycle(); busy.set(false); });
    } catch (Exception error) { busy.set(false); DropZoneModule.emit("scannerError", error.getMessage()); }
  }
}
