package com.sahayog.hr;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Prevent Android & Capacitor from applying redundant bottom IME padding
        // when windowSoftInputMode="adjustResize" is active.
        View decorView = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (v, insets) -> {
            Insets sysBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(sysBars.left, sysBars.top, sysBars.right, 0);
            return insets;
        });

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
