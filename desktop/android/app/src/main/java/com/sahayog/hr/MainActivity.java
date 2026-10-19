package com.sahayog.hr;

import android.os.Bundle;
import android.view.View;
import androidx.core.view.ViewCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fix for Android/Capacitor double-padding bug with keyboard & system insets:
        // Prevents the WebView parent CoordinatorLayout from applying conflicting insets
        // that cause a large black/blank dead space above the software keyboard.
        getBridge().getWebView().post(() -> {
            View parent = (View) getBridge().getWebView().getParent();
            if (parent != null) {
                ViewCompat.setOnApplyWindowInsetsListener(parent, (v, insets) -> {
                    v.setPadding(0, 0, 0, 0);
                    return insets;
                });
                getBridge().getWebView().requestApplyInsets();
            }
        });
    }
}
