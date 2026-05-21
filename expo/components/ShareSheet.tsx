import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  Coins,
  Copy,
  Facebook,
  Footprints,
  Instagram,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  MessageSquare,
  Send,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StrideStatusBadge } from "@/components/StrideStatusBadge";
import { getStrideStatus } from "@/constants/status";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";
import type { Vault, VaultBrand } from "@/types/game";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** When sharing from a fresh vault unlock, pass the vault for branded copy. */
  vault?: Vault;
}

const SHARE_LINK_BASE = "https://rork.app/stride-quest";

const BRAND_TINT: Record<VaultBrand, { color: string; glow: string; tag: string }> = {
  nike: { color: "#FF6B00", glow: "#FFB266", tag: "NIKE DROP" },
  apple: { color: "#E5E7EB", glow: "#FFFFFF", tag: "APPLE DROP" },
};

/**
 * Cinematic share sheet — shows a live preview of the share card the user
 * will post, then triggers the native share dialog. Pays Stride Coins on
 * each share (capped daily) and surfaces the referral payout copy.
 */
export function ShareSheet({ visible, onClose, vault }: Props) {
  const {
    player,
    recordShare,
    shareDailyCap,
    shareRewardCoins,
    referralBonusCoins,
  } = useGame();
  const [copied, setCopied] = useState<boolean>(false);

  const refCode = useMemo(
    () => `STRIDE-${player.username.replace(/\W+/g, "").toUpperCase().slice(0, 6)}`,
    [player.username]
  );

  const tint = vault?.brand ? BRAND_TINT[vault.brand] : null;
  const status = getStrideStatus(player.claimed.length);
  const remaining = Math.max(0, shareDailyCap - player.sharesToday);
  const canEarn = remaining > 0;

  const message = useMemo(() => {
    if (vault?.brand === "nike") {
      return `I just unlocked the ${vault.name} Nike Drop on Stride Quest 👟🔥\n\nWalking around London = real Nike rewards. Use my code ${refCode} when you join and we BOTH get ${referralBonusCoins} coins.\n\n${SHARE_LINK_BASE}?ref=${refCode}`;
    }
    if (vault?.brand === "apple") {
      return `Just AirDropped open the ${vault.name} Apple vault on Stride Quest 🍏✨\n\nReal Apple credit for walking past stores. Join with my code ${refCode} → we both get ${referralBonusCoins} coins.\n\n${SHARE_LINK_BASE}?ref=${refCode}`;
    }
    if (vault) {
      return `Just cracked the ${vault.name} vault on Stride Quest. ${vault.reward.coins} coins in the bag 💰\n\nJoin London's IRL treasure hunt with code ${refCode} — we both get ${referralBonusCoins} coins.\n\n${SHARE_LINK_BASE}?ref=${refCode}`;
    }
    return `I'm hunting brand vaults across London on Stride Quest 👟\n\n${player.claimed.length} vaults claimed · ${status.current.label} tier\n\nJoin with code ${refCode} — we BOTH get ${referralBonusCoins} coins.\n\n${SHARE_LINK_BASE}?ref=${refCode}`;
  }, [vault, refCode, referralBonusCoins, player.claimed.length, status.current.label]);

  const onShare = useCallback(async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        console.log("[ShareSheet] haptics", e);
      }
    }
    try {
      const res = await Share.share({ message });
      if (res.action !== Share.dismissedAction) {
        await recordShare();
      }
    } catch (e) {
      console.log("[ShareSheet] share failed", e);
    }
  }, [message, recordShare]);

  /** Opens an external URL, gracefully falling back to the native share sheet
   * if the target app isn't installed (e.g. WhatsApp on a device without it). */
  const openExternal = useCallback(
    async (url: string, fallbackToShare: boolean = true) => {
      if (Platform.OS !== "web") {
        try {
          await Haptics.selectionAsync();
        } catch {}
      }
      try {
        const can = await Linking.canOpenURL(url);
        if (!can) throw new Error("cannot open");
        await Linking.openURL(url);
        await recordShare();
      } catch (e) {
        console.log("[ShareSheet] openExternal fallback", e);
        if (fallbackToShare) {
          try {
            const res = await Share.share({ message });
            if (res.action !== Share.dismissedAction) await recordShare();
          } catch (err) {
            console.log("[ShareSheet] fallback share failed", err);
          }
        }
      }
    },
    [message, recordShare]
  );

  const shareLink = useMemo(
    () => `${SHARE_LINK_BASE}?ref=${refCode}`,
    [refCode]
  );

  const channels = useMemo(
    () => ({
      instagram: async () => {
        // Instagram has no public text-share intent — best UX is copy caption
        // then deep-link into the app so the user can paste into a Story/DM.
        try {
          if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
            await navigator.clipboard.writeText(message);
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {}
        const url = Platform.OS === "ios" ? "instagram://app" : "https://www.instagram.com/";
        const opened = await Linking.canOpenURL(url).catch(() => false);
        if (opened) {
          await Linking.openURL(url);
          await recordShare();
          if (Platform.OS !== "web") {
            Alert.alert("Caption copied", "Paste it into your Story or DM.");
          }
        } else {
          await openExternal("https://www.instagram.com/");
        }
      },
      facebook: () =>
        openExternal(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}&quote=${encodeURIComponent(message)}`
        ),
      twitter: () =>
        openExternal(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`
        ),
      whatsapp: () =>
        openExternal(`whatsapp://send?text=${encodeURIComponent(message)}`),
      telegram: () =>
        openExternal(
          `tg://msg_url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(message)}`
        ),
      sms: () => {
        const sep = Platform.OS === "ios" ? "&" : "?";
        return openExternal(`sms:${sep}body=${encodeURIComponent(message)}`);
      },
      email: () =>
        openExternal(
          `mailto:?subject=${encodeURIComponent("Join me on Stride Quest")}&body=${encodeURIComponent(message)}`
        ),
      link: async () => {
        try {
          if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
            await navigator.clipboard.writeText(shareLink);
          }
          if (Platform.OS !== "web") {
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
          await recordShare();
        } catch (e) {
          console.log("[ShareSheet] link copy failed", e);
        }
      },
    }),
    [message, shareLink, openExternal, recordShare]
  );

  const onCopy = useCallback(async () => {
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      await recordShare();
    } catch (e) {
      console.log("[ShareSheet] copy failed", e);
    }
  }, [message, recordShare]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <BlurView intensity={Platform.OS === "ios" ? 28 : 0} tint="dark" style={styles.sheet}>
          <View style={styles.sheetInner}>
            <View style={styles.grabber} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>SHARE THE DROP</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <X size={16} color={theme.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {/* Live preview card */}
              <View style={[styles.previewCard, tint && { borderColor: tint.color + "AA" }]}>
                <LinearGradient
                  colors={
                    tint
                      ? [tint.color + "55", tint.color + "08", "transparent"]
                      : ["rgba(212,175,55,0.35)", "rgba(212,175,55,0.05)", "transparent"]
                  }
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.previewTop}>
                  <View style={styles.previewBrandRow}>
                    {tint && (
                      <View style={[styles.brandChip, { backgroundColor: tint.glow }]}>
                        <Text style={styles.brandChipText}>{tint.tag}</Text>
                      </View>
                    )}
                    <StrideStatusBadge status={status.current} size="sm" />
                  </View>
                  <Text style={styles.previewLogo}>STRIDE · QUEST</Text>
                </View>

                <Text style={styles.previewLine1}>
                  {vault ? `Just unlocked` : `Hunting vaults`}
                </Text>
                <Text style={styles.previewTitle} numberOfLines={2}>
                  {vault ? vault.name : "across London"}
                </Text>

                <View style={styles.previewStats}>
                  <View style={styles.previewStat}>
                    <Coins size={14} color={theme.gold} />
                    <Text style={styles.previewStatVal}>
                      {(vault?.reward.coins ?? player.coins).toLocaleString()}
                    </Text>
                    <Text style={styles.previewStatLab}>
                      {vault ? "EARNED" : "COINS"}
                    </Text>
                  </View>
                  <View style={styles.previewStat}>
                    <Trophy size={14} color={theme.goldBright} />
                    <Text style={styles.previewStatVal}>{player.claimed.length}</Text>
                    <Text style={styles.previewStatLab}>VAULTS</Text>
                  </View>
                  <View style={styles.previewStat}>
                    <Footprints size={14} color={theme.emeraldBright} />
                    <Text style={styles.previewStatVal}>
                      {Math.round(player.steps / 1000)}k
                    </Text>
                    <Text style={styles.previewStatLab}>STEPS</Text>
                  </View>
                </View>

                <View style={styles.refRow}>
                  <Text style={styles.refLabel}>JOIN WITH MY CODE</Text>
                  <Text style={[styles.refCode, tint && { color: tint.glow }]}>{refCode}</Text>
                </View>

                <Text style={styles.refPayout}>
                  +{referralBonusCoins} coins each when a friend signs up
                </Text>
              </View>

              {/* Direct-to-channel share buttons */}
              <Text style={styles.sectionLabel}>POST TO</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.channelRow}
              >
                <ChannelButton label="Instagram" color="#E1306C" onPress={channels.instagram}>
                  <Instagram size={22} color="#FFFFFF" />
                </ChannelButton>
                <ChannelButton label="Stories" color="#000000" onPress={channels.instagram}>
                  <LinearGradient
                    colors={["#FEDA77", "#F58529", "#DD2A7B", "#8134AF", "#515BD4"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Sparkles size={22} color="#FFFFFF" />
                </ChannelButton>
                <ChannelButton label="Facebook" color="#1877F2" onPress={channels.facebook}>
                  <Facebook size={22} color="#FFFFFF" />
                </ChannelButton>
                <ChannelButton label="X" color="#0E0E0E" onPress={channels.twitter}>
                  <Text style={styles.xMark}>𝕏</Text>
                </ChannelButton>
                <ChannelButton label="WhatsApp" color="#25D366" onPress={channels.whatsapp}>
                  <MessageCircle size={22} color="#FFFFFF" />
                </ChannelButton>
                <ChannelButton label="Telegram" color="#229ED9" onPress={channels.telegram}>
                  <Send size={22} color="#FFFFFF" />
                </ChannelButton>
                <ChannelButton label="Messages" color="#34C759" onPress={channels.sms}>
                  <MessageSquare size={22} color="#FFFFFF" />
                </ChannelButton>
                <ChannelButton label="Email" color="#5A5A5A" onPress={channels.email}>
                  <Mail size={22} color="#FFFFFF" />
                </ChannelButton>
                <ChannelButton label="Copy link" color="#1A1F2E" onPress={channels.link}>
                  <LinkIcon size={22} color={theme.gold} />
                </ChannelButton>
              </ScrollView>
              <Text style={styles.channelHint}>
                Tip: Instagram doesn&apos;t support direct text share — we copy your caption + open the app so you can paste it.
              </Text>

              {/* Caption preview (what the user will actually paste) */}
              <Text style={styles.sectionLabel}>YOUR CAPTION</Text>
              <View style={styles.captionCard}>
                <Text style={styles.captionText}>{message}</Text>
              </View>

              {/* Tokenomics breakdown */}
              <Text style={styles.sectionLabel}>SHARE REWARDS</Text>
              <View style={styles.economicsCard}>
                <View style={styles.econRow}>
                  <View style={[styles.econIcon, { backgroundColor: theme.gold + "22" }]}>
                    <Sparkles size={14} color={theme.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.econLabel}>Per share</Text>
                    <Text style={styles.econSub}>
                      Up to {shareDailyCap}× per day · {remaining} left today
                    </Text>
                  </View>
                  <Text style={[styles.econVal, !canEarn && { color: theme.textDim }]}>
                    +{shareRewardCoins}
                  </Text>
                </View>
                <View style={styles.econDivider} />
                <View style={styles.econRow}>
                  <View style={[styles.econIcon, { backgroundColor: theme.emerald + "22" }]}>
                    <Users size={14} color={theme.emeraldBright} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.econLabel}>Per friend who joins</Text>
                    <Text style={styles.econSub}>
                      They get +{referralBonusCoins} too · {player.referralSignups} so far
                    </Text>
                  </View>
                  <Text style={[styles.econVal, { color: theme.emeraldBright }]}>
                    +{referralBonusCoins}
                  </Text>
                </View>
                <View style={styles.econDivider} />
                <View style={styles.econRow}>
                  <View style={[styles.econIcon, { backgroundColor: theme.surface }]}>
                    <Coins size={14} color={theme.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.econLabel}>Earned from sharing</Text>
                    <Text style={styles.econSub}>{player.lifetimeShares} shares lifetime</Text>
                  </View>
                  <Text style={styles.econVal}>{player.shareCoinsEarned.toLocaleString()}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable onPress={onCopy} style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}>
                <Copy size={14} color={theme.text} />
                <Text style={styles.secondaryBtnText}>{copied ? "COPIED" : "COPY"}</Text>
              </Pressable>
              <Pressable onPress={onShare} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
                <LinearGradient
                  colors={tint ? [tint.color, tint.glow] : [theme.gold, theme.goldBright]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.primaryBtnText}>
                  SHARE NOW {canEarn ? `· +${shareRewardCoins}` : ""}
                </Text>
              </Pressable>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    maxHeight: "92%",
  },
  sheetInner: {
    backgroundColor: Platform.OS === "ios" ? "rgba(12,15,26,0.92)" : theme.bgElev,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 22,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    alignSelf: "center",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
  },
  headerTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "900" as const,
    letterSpacing: 2.2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCard: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.gold + "55",
    padding: 18,
    overflow: "hidden",
    backgroundColor: theme.bgCard,
    marginBottom: 18,
  },
  previewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  previewBrandRow: { flexDirection: "row", gap: 6, alignItems: "center", flex: 1, flexWrap: "wrap" },
  brandChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  brandChipText: {
    color: "#0E1117",
    fontSize: 9,
    fontWeight: "900" as const,
    letterSpacing: 1.4,
  },
  previewLogo: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: "900" as const,
    letterSpacing: 2,
  },
  previewLine1: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  previewTitle: {
    color: theme.text,
    fontSize: 26,
    fontWeight: "900" as const,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 30,
  },
  previewStats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  previewStat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: theme.radius.md,
    alignItems: "center",
    gap: 2,
  },
  previewStatVal: { color: theme.text, fontSize: 16, fontWeight: "900" as const, marginTop: 2 },
  previewStatLab: { color: theme.textDim, fontSize: 9, fontWeight: "800" as const, letterSpacing: 1.2 },
  refRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 4,
  },
  refLabel: {
    color: theme.textDim,
    fontSize: 9,
    fontWeight: "800" as const,
    letterSpacing: 1.6,
  },
  refCode: {
    color: theme.goldBright,
    fontSize: 22,
    fontWeight: "900" as const,
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  refPayout: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: "700" as const,
    marginTop: 4,
  },
  sectionLabel: {
    color: theme.textDim,
    fontSize: 10,
    fontWeight: "900" as const,
    letterSpacing: 1.8,
    marginBottom: 8,
    marginTop: 4,
  },
  captionCard: {
    padding: 14,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    marginBottom: 18,
  },
  captionText: {
    color: theme.text,
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "600" as const,
  },
  economicsCard: {
    padding: 6,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    marginBottom: 4,
  },
  econRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  econIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  econLabel: { color: theme.text, fontSize: 13, fontWeight: "800" as const },
  econSub: { color: theme.textDim, fontSize: 11, marginTop: 2, fontWeight: "600" as const },
  econVal: { color: theme.gold, fontSize: 18, fontWeight: "900" as const },
  econDivider: { height: 1, backgroundColor: theme.borderSoft, marginHorizontal: 10 },
  channelRow: {
    gap: 10,
    paddingVertical: 4,
    paddingRight: 8,
    marginBottom: 8,
  },
  channelBtn: {
    width: 72,
    alignItems: "center",
    gap: 6,
  },
  channelIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  channelLabel: {
    color: theme.text,
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  xMark: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900" as const,
    lineHeight: 24,
  },
  channelHint: {
    color: theme.textDim,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "600" as const,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 14,
  },
  secondaryBtn: {
    paddingHorizontal: 18,
    height: 50,
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
  },
  secondaryBtnText: { color: theme.text, fontSize: 12, fontWeight: "900" as const, letterSpacing: 1.4 },
  primaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  primaryBtnText: {
    color: "#0E1117",
    fontSize: 13,
    fontWeight: "900" as const,
    letterSpacing: 1.6,
  },
});

interface ChannelButtonProps {
  label: string;
  color: string;
  textColor?: string;
  onPress: () => void;
  children: React.ReactNode;
}

function ChannelButton({ label, color, onPress, children }: ChannelButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.channelBtn, pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] }]}
    >
      <View style={[styles.channelIcon, { backgroundColor: color, overflow: "hidden" }]}>
        {children}
      </View>
      <Text style={styles.channelLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}
