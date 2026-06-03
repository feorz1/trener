import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";

export type AlertTone = "neutral" | "positive" | "negative" | "warning";
export type AlertLayout = "compact" | "expanded" | "action";
export type AlertWidth = "fixed" | "fill";

export type AlertProps = {
  tone?: AlertTone;
  layout?: AlertLayout;
  title?: string;
  description?: string;
  actionLabel?: string;
  width?: AlertWidth;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onAction?: () => void;
  onClose?: () => void;
  onToggle?: (expanded: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

const toneConfig: Record<AlertTone, { iconBackgroundColor: string; iconColor: string; iconName: IconName; title: string }> = {
  neutral: {
    iconBackgroundColor: theme.colors.content.body,
    iconColor: theme.colors.background.canvas,
    iconName: "information",
    title: "This is a neutral alert."
  },
  positive: {
    iconBackgroundColor: theme.colors.status.positiveDeep,
    iconColor: theme.colors.background.canvas,
    iconName: "checkmark",
    title: "This is a positive alert."
  },
  negative: {
    iconBackgroundColor: theme.colors.status.negative,
    iconColor: theme.colors.background.canvas,
    iconName: "close",
    title: "This is a negative alert."
  },
  warning: {
    iconBackgroundColor: theme.colors.status.warning,
    iconColor: theme.colors.content.ink,
    iconName: "warning",
    title: "This is a warning alert."
  }
};

export function Alert({
  tone = "neutral",
  layout = "compact",
  title,
  description = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
  actionLabel = "Button",
  width = "fixed",
  expanded,
  defaultExpanded,
  onExpandedChange,
  onAction,
  onClose,
  onToggle,
  style
}: AlertProps) {
  const config = toneConfig[tone];
  const isCompact = layout === "compact";
  const isCollapsible = !isCompact;
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded ?? isCollapsible);
  const isExpanded = isCollapsible && (expanded ?? internalExpanded);
  const [renderRichContent, setRenderRichContent] = useState(isExpanded);
  const animationProgress = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const showAction = layout === "action" && renderRichContent;
  const showToggle = !isCompact;
  const richContentVisible = isCollapsible && renderRichContent;
  const richContentMaxHeight =
    layout === "action" ? theme.sizes.alertActionContentMaxHeight : theme.sizes.alertExpandedContentMaxHeight;

  useEffect(() => {
    if (expanded === undefined) {
      setInternalExpanded(defaultExpanded ?? isCollapsible);
    }
  }, [defaultExpanded, expanded, isCollapsible, layout]);

  useEffect(() => {
    if (!isCollapsible) {
      setRenderRichContent(false);
      animationProgress.setValue(0);
      return;
    }

    if (isExpanded) {
      setRenderRichContent(true);
    }

    Animated.timing(animationProgress, {
      toValue: isExpanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start(({ finished }) => {
      if (finished && !isExpanded) {
        setRenderRichContent(false);
      }
    });
  }, [animationProgress, isCollapsible, isExpanded]);

  const handleToggle = () => {
    const nextExpanded = !isExpanded;
    if (expanded === undefined) {
      setInternalExpanded(nextExpanded);
    }
    onExpandedChange?.(nextExpanded);
    onToggle?.(nextExpanded);
    if (!nextExpanded) {
      onClose?.();
    }
  };

  return (
    <View
      style={[
        styles.root,
        width === "fixed" ? styles.fixedWidth : styles.fillWidth,
        isCompact ? styles.compactRoot : richContentVisible ? styles.richOpenRoot : styles.richCollapsedRoot,
        style
      ]}
    >
      <View style={[styles.icon, { backgroundColor: config.iconBackgroundColor }]}>
        <Icon name={config.iconName} size={theme.spacing.xl} color={config.iconColor} />
      </View>

      <View style={[styles.content, !isCompact && styles.richContent]}>
        <Text style={styles.title}>{title ?? config.title}</Text>
        {richContentVisible ? (
          <Animated.View
            style={[
              styles.collapsibleContent,
              {
                opacity: animationProgress,
                maxHeight: animationProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [theme.spacing[0], richContentMaxHeight]
                }),
                transform: [
                  {
                    translateY: animationProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-theme.spacing.xs, theme.spacing[0]]
                    })
                  }
                ]
              }
            ]}
          >
            <Text style={styles.description}>{description}</Text>
            {showAction ? <Button type="tertiary" size="small" label={actionLabel} onPress={onAction} style={styles.actionButton} /> : null}
          </Animated.View>
        ) : null}
      </View>

      {showToggle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? "Collapse alert" : "Expand alert"}
          accessibilityState={{ expanded: isExpanded }}
          onPress={handleToggle}
          style={({ pressed }) => [styles.toggle, !isCompact && styles.richToggle, pressed && styles.pressed]}
        >
          <Icon name={isExpanded ? "chevron up" : "chevron down"} size={theme.spacing.lg} color={theme.colors.content.inkDeep} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvasSoft
  },
  fixedWidth: {
    width: theme.sizes.alertWidth
  },
  fillWidth: {
    alignSelf: "stretch"
  },
  compactRoot: {
    minHeight: theme.sizes.alertCompactMinHeight,
    alignItems: "center",
    borderRadius: theme.radius.pill
  },
  richOpenRoot: {
    borderRadius: theme.radius.xl
  },
  richCollapsedRoot: {
    minHeight: theme.sizes.alertCompactMinHeight,
    alignItems: "flex-start",
    borderRadius: theme.radius.xl
  },
  icon: {
    width: theme.sizes.alertIcon,
    height: theme.sizes.alertIcon,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center"
  },
  content: {
    flex: 1,
    gap: theme.spacing.sm,
    justifyContent: "center"
  },
  richContent: {
    paddingTop: theme.spacing.xs
  },
  collapsibleContent: {
    gap: theme.spacing.sm,
    overflow: "hidden"
  },
  actionButton: {
    alignSelf: "flex-start"
  },
  title: {
    ...theme.typography.body.md,
    color: theme.colors.content.ink
  },
  description: {
    ...theme.typography.body.sm,
    color: theme.colors.content.body
  },
  toggle: {
    width: theme.sizes.alertActionIcon,
    height: theme.sizes.alertActionIcon,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background.canvasSoft
  },
  richToggle: {
    marginTop: theme.spacing.xs
  },
  pressed: {
    opacity: 0.72
  }
});
