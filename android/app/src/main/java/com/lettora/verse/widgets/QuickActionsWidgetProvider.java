package com.lettora.verse.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import com.lettora.verse.MainActivity;
import com.lettora.verse.R;

public class QuickActionsWidgetProvider extends AppWidgetProvider {
    private static final int FLAG = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_actions);
            views.setOnClickPendingIntent(R.id.widget_root, openApp(context, "home"));
            views.setOnClickPendingIntent(R.id.action_home, openApp(context, "home"));
            views.setOnClickPendingIntent(R.id.action_explore, openApp(context, "explore"));
            views.setOnClickPendingIntent(R.id.action_profile, openApp(context, "profile"));
            manager.updateAppWidget(widgetId, views);
        }
    }

    private PendingIntent openApp(Context context, String destination) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.putExtra("widget_destination", destination);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, destination.hashCode(), intent, FLAG);
    }

    public static void refresh(Context context) {
        Intent intent = new Intent(context, QuickActionsWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(new ComponentName(context, QuickActionsWidgetProvider.class));
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);
    }
}
