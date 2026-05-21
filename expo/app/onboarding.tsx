/**
 * First-run onboarding — splash → value carousel → sign-in → profile →
 * step goal → tribe → referral → permission primers → welcome.
 *
 * Single screen with internal step state so progress is held in memory and
 * the gate in _layout.tsx switches to the tabs once completeOnboarding fires.
 */
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import {
  Apple,
  ArrowRight,
  Bell,
  Check,
  ChevronLeft,
  Coins,
  Footprints,
  Gift,
  Mail,
  MapPin,
  Sparkles,
  Trophy,
  X,
  Zap,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CITIES, CITY_BY_ID, LIVE_CITY_ID, detectCity, flagEmoji } from "@/constants/cities";
import { TRIBES, tribesForCity } from "@/constants/retention";
import { Share } from "react-native";
import { theme } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { requestNotificationPermission } from "@/lib/notifications";
import { isPedometerAvailable, requestPedometerPermission } from "@/lib/pedometer";
import { useGame } from "@/providers/GameProvider";

const { width: SCREEN_W } = Dimensions.get("window");

type Step =
  | "splash"
  | "value"
  | "signin"
  | "profile"
  | "goal"
  | "tribe"
  | "referral"
  | "motion"
  | "notifications"
  | "location"
  | "city"
  | "welcome";

// City comes BEFORE tribe so the tribe picker can show city-relevant clubs
// (e.g. Manchester doesn't see Arsenal/Chelsea).
const STEP_ORDER: Step[] = [
  "splash",
  "value",
  "signin",
  "profile",
  "goal",
  "motion",
  "notifications",
  "location",
  "city",
  "tribe",
  "referral",
  "welcome",
];

const AVATARS = ["halcyon-7", "ember-3", "azure-9", "lumen-2", "vega-5", "obsidian-1"] as const;
const STEP_GOALS = [3000, 5000, 8000, 10000, 15000] as const;

export default function OnboardingScreen() {
  const { user, isSigningIn, signIn, signUpEmail, signInEmail, error: authError, clearError } = useAuth();
  const { completeOnboarding, claimReferral, brands, setHomeCity } = useGame();

  const [step, setStep] = useState<Step>("splash");

  // Form state.
  const [username, setUsername] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [avatarIdx, setAvatarIdx] = useState<number>(0);
  const [goal, setGoal] = useState<number>(8000);
  const [tribeId, setTribeId] = useState<string | undefined>(undefined);
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [motionGranted, setMotionGranted] = useState<boolean>(false);
  const [notifGranted, setNotifGranted] = useState<boolean>(false);
  const [locationGranted, setLocationGranted] = useState<boolean>(false);

  // Email sheet state.
  const [emailMode, setEmailMode] = useState<"closed" | "signin" | "signup">("closed");
  const [emailAddr, setEmailAddr] = useState<string>("");
  const [emailPwd, setEmailPwd] = useState<string>("");
  const [emailErr, setEmailErr] = useState<string | null>(null);

  // Animations.
  const fade = useRef(new Animated.Value(0)).current;
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.6)).current;
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const carouselIdx = useRef(new Animated.Value(0)).current;

  // Ambient orbs (always-on).
  useEffect(() => {
    Animated.loop(
      Animated.timing(orb1, { toValue: 1, duration: 18000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.timing(orb2, { toValue: 1, duration: 26000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ).start();
  }, [orb1, orb2]);

  // Splash sequence + auto-advance.
  useEffect(() => {
    if (step !== "splash") return;
    Animated.parallel([
      Animated.spring(splashScale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(splashOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => goNext(), 1600);
    return () => clearTimeout(t);
  }, [step, splashScale, splashOpacity]);

  // Cross-fade between steps.
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [step, fade]);

  const haptic = useCallback((kind: "tap" | "success" = "tap") => {
    if (Platform.OS === "web") return;
    if (kind === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.selectionAsync().catch(() => {});
    }
  }, []);

  const goNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
    haptic("tap");
  }, [step, haptic]);

  const goBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 1) setStep(STEP_ORDER[idx - 1]); // can't go behind splash
    haptic("tap");
  }, [step, haptic]);

  // Once signed in, auto-advance from signin step.
  useEffect(() => {
    if (step === "signin" && user) {
      // Pre-fill defaults from auth user.
      if (!firstName && user.name) setFirstName(user.name.split(" ")[0] ?? "");
      if (!username) {
        const seed = (user.name ?? user.email.split("@")[0] ?? "stride").toLowerCase().replace(/[^a-z0-9]/g, "");
        setUsername(seed.slice(0, 16));
      }
      const t = setTimeout(() => setStep("profile"), 300);
      return () => clearTimeout(t);
    }
  }, [step, user, firstName, username]);

  // Username availability — basic deterministic check (reserved list).
  const reserved = useMemo(() => new Set(["admin", "stride", "rork", "test", "kai.mercer", "sable", "junopark"]), []);
  const usernameValid = useMemo(() => {
    const u = username.trim().toLowerCase();
    if (u.length < 3) return null;
    if (!/^[a-z0-9._]+$/.test(u)) return false;
    if (reserved.has(u)) return false;
    return true;
  }, [username, reserved]);

  // City selection (auto-detected from foreground location when granted).
  const [cityId, setCityId] = useState<string | undefined>(undefined);

  // Total numbered steps (excluding splash + signin + welcome).
  const progressTotal = 8;
  const progressIdx = useMemo(() => {
    const map: Partial<Record<Step, number>> = {
      value: 0,
      profile: 1,
      goal: 2,
      motion: 3,
      notifications: 4,
      location: 5,
      city: 6,
      tribe: 7,
      referral: 8,
    };
    return map[step] ?? 0;
  }, [step]);

  const showProgress = step !== "splash" && step !== "signin" && step !== "welcome";

  // ── handlers ───────────────────────────────────────────────────────────────
  const onSignIn = useCallback(
    async (provider: "google" | "apple") => {
      clearError();
      haptic("tap");
      await signIn(provider);
    },
    [signIn, clearError, haptic]
  );

  const onEmailSubmit = useCallback(async () => {
    setEmailErr(null);
    if (emailMode === "signup") {
      const res = await signUpEmail(emailAddr, emailPwd, firstName || undefined);
      if (!res.ok) setEmailErr(res.reason ?? "Sign-up failed");
      else setEmailMode("closed");
    } else if (emailMode === "signin") {
      const res = await signInEmail(emailAddr, emailPwd);
      if (!res.ok) setEmailErr(res.reason ?? "Sign-in failed");
      else setEmailMode("closed");
    }
  }, [emailMode, emailAddr, emailPwd, firstName, signUpEmail, signInEmail]);

  const onRequestMotion = useCallback(async () => {
    haptic("tap");
    const available = await isPedometerAvailable();
    if (!available) {
      setMotionGranted(false);
      goNext();
      return;
    }
    const granted = await requestPedometerPermission();
    setMotionGranted(granted);
    goNext();
  }, [goNext, haptic]);

  const onRequestNotif = useCallback(async () => {
    haptic("tap");
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    goNext();
  }, [goNext, haptic]);

  const onRequestLocation = useCallback(async () => {
    haptic("tap");
    try {
      const res = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(res.granted);
      // Auto-detect city if we got a fix so the next step has a friendly default.
      if (res.granted) {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const c = detectCity(pos.coords.latitude, pos.coords.longitude);
          if (c) setCityId(c.id);
        } catch (e) {
          console.log("[onboarding] city detect", e);
        }
      }
    } catch (e) {
      console.log("[onboarding] location", e);
      setLocationGranted(false);
    }
    goNext();
  }, [goNext, haptic]);

  const onReferralCheck = useCallback(() => {
    const v = referralCode.trim().toUpperCase();
    if (!v) {
      setReferralValid(null);
      return;
    }
    // Valid format: 6-8 alphanumeric.
    setReferralValid(/^[A-Z0-9]{4,10}$/.test(v));
  }, [referralCode]);

  useEffect(() => {
    onReferralCheck();
  }, [referralCode, onReferralCheck]);

  const onFinish = useCallback(async () => {
    haptic("success");
    if (referralValid) {
      await claimReferral();
    }
    if (cityId) await setHomeCity(cityId);
    await completeOnboarding({
      username: username.trim() || undefined,
      avatarSeed: AVATARS[avatarIdx],
      firstName: firstName.trim() || undefined,
      dailyStepGoal: goal,
      tribeId,
      authId: user?.id,
      authEmail: user?.email,
      authProvider: user?.provider,
      motionGranted,
      locationGranted,
      notificationsEnabled: notifGranted,
      welcomeBonus: 100,
    });
    router.replace("/(tabs)");
  }, [
    haptic,
    referralValid,
    claimReferral,
    completeOnboarding,
    cityId,
    setHomeCity,
    username,
    avatarIdx,
    firstName,
    goal,
    tribeId,
    user,
    motionGranted,
    locationGranted,
    notifGranted,
  ]);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Ambient gradient orbs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={[theme.bg, "#0A0E1F", theme.bg]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Animated.View
          style={[
            styles.orb,
            {
              backgroundColor: "#10B981",
              transform: [
                {
                  translateX: orb1.interpolate({ inputRange: [0, 1], outputRange: [-80, SCREEN_W - 200] }),
                },
                { translateY: orb1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [120, 380, 120] }) },
              ],
              opacity: 0.18,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.orb,
            {
              backgroundColor: "#F4D03F",
              width: 380,
              height: 380,
              transform: [
                {
                  translateX: orb2.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_W - 200, -100] }),
                },
                { translateY: orb2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [560, 200, 560] }) },
              ],
              opacity: 0.1,
            },
          ]}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {/* Top bar */}
        {showProgress ? (
          <View style={styles.topBar}>
            <Pressable onPress={goBack} hitSlop={10} style={styles.iconBtn}>
              <ChevronLeft size={20} color={theme.text} />
            </Pressable>
            <View style={styles.dotsRow}>
              {Array.from({ length: progressTotal }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i < progressIdx && styles.dotDone, i === progressIdx - 1 && styles.dotActive]}
                />
              ))}
            </View>
            {/* "Skip" only on skippable steps. */}
            {(step === "goal" || step === "tribe" || step === "referral" || step === "motion" || step === "notifications" || step === "location" || step === "city") ? (
              <Pressable onPress={goNext} hitSlop={10} style={styles.iconBtn}>
                <Text style={styles.skipText}>SKIP</Text>
              </Pressable>
            ) : (
              <View style={styles.iconBtn} />
            )}
          </View>
        ) : null}

        <Animated.View style={[styles.content, { opacity: fade }]}>
          {step === "splash" ? <SplashStep scale={splashScale} opacity={splashOpacity} /> : null}
          {step === "value" ? <ValueStep brandsCount={brands.length} onNext={goNext} /> : null}
          {step === "signin" ? (
            <SignInStep
              onApple={() => onSignIn("apple")}
              onGoogle={() => onSignIn("google")}
              onEmail={() => setEmailMode("signup")}
              isSigningIn={isSigningIn}
              error={authError}
            />
          ) : null}
          {step === "profile" ? (
            <ProfileStep
              username={username}
              setUsername={setUsername}
              firstName={firstName}
              setFirstName={setFirstName}
              avatarIdx={avatarIdx}
              setAvatarIdx={setAvatarIdx}
              valid={usernameValid}
              onNext={goNext}
            />
          ) : null}
          {step === "goal" ? <GoalStep goal={goal} setGoal={setGoal} onNext={goNext} /> : null}
          {step === "tribe" ? <TribeStep tribeId={tribeId} setTribeId={setTribeId} cityId={cityId} onNext={goNext} /> : null}
          {step === "referral" ? (
            <ReferralStep
              code={referralCode}
              setCode={setReferralCode}
              valid={referralValid}
              onNext={goNext}
            />
          ) : null}
          {step === "motion" ? <MotionStep onAllow={onRequestMotion} onSkip={goNext} /> : null}
          {step === "notifications" ? <NotifStep onAllow={onRequestNotif} onSkip={goNext} /> : null}
          {step === "location" ? <LocationStep onAllow={onRequestLocation} onSkip={goNext} /> : null}
          {step === "city" ? <CityStep cityId={cityId} setCityId={setCityId} username={username} onNext={goNext} /> : null}
          {step === "welcome" ? <WelcomeStep firstName={firstName || username} onFinish={onFinish} /> : null}
        </Animated.View>
      </SafeAreaView>

      {/* Email sheet */}
      {emailMode !== "closed" ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrap}
          pointerEvents="box-none"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEmailMode("closed")} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{emailMode === "signup" ? "Create account" : "Sign in"}</Text>
              <Pressable onPress={() => setEmailMode("closed")} hitSlop={10} style={styles.iconBtn}>
                <X size={18} color={theme.textMuted} />
              </Pressable>
            </View>
            <TextInput
              value={emailAddr}
              onChangeText={setEmailAddr}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={theme.textDim}
              style={styles.input}
            />
            <TextInput
              value={emailPwd}
              onChangeText={setEmailPwd}
              secureTextEntry
              placeholder="Password (6+ chars)"
              placeholderTextColor={theme.textDim}
              style={styles.input}
            />
            {emailErr ? <Text style={styles.errText}>{emailErr}</Text> : null}
            <Pressable
              disabled={isSigningIn}
              onPress={onEmailSubmit}
              style={({ pressed }) => [styles.primaryBtn, isSigningIn && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.99 }] }]}
            >
              {isSigningIn ? (
                <ActivityIndicator color="#06070D" />
              ) : (
                <Text style={styles.primaryBtnText}>{emailMode === "signup" ? "CREATE ACCOUNT" : "SIGN IN"}</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setEmailMode(emailMode === "signup" ? "signin" : "signup")} hitSlop={8}>
              <Text style={styles.toggleLink}>
                {emailMode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

// ── Step components ──────────────────────────────────────────────────────────

function SplashStep({ scale, opacity }: { scale: Animated.Value; opacity: Animated.Value }) {
  return (
    <View style={styles.splashWrap}>
      <Animated.View style={{ transform: [{ scale }], opacity, alignItems: "center" }}>
        <View style={styles.splashIcon}>
          <Coins size={42} color="#06070D" />
        </View>
        <Text style={styles.splashWord}>STRIDE</Text>
        <Text style={styles.splashTag}>Walk. Earn. Win.</Text>
      </Animated.View>
    </View>
  );
}

function ValueStep({ brandsCount, onNext }: { brandsCount: number; onNext: () => void }) {
  const [idx, setIdx] = useState<number>(0);
  const slides = [
    { icon: Footprints, headline: "Walk. Anywhere.", body: "Real steps power the whole game. Your phone counts them in the background." },
    { icon: Coins, headline: "Turn steps into coins.", body: "Claim vaults around the city. Streaks, Power Hours and Hot Vaults boost your haul." },
    {
      icon: Gift,
      headline: "Spend them on real rewards.",
      body: brandsCount > 0 ? `Cash out on partner drops across ${brandsCount} brand${brandsCount === 1 ? "" : "s"}.` : "Discounts, gifts and partner drops — all paid in coins you walked for.",
    },
  ];
  const slide = slides[idx];
  const Icon = slide.icon;
  return (
    <View style={styles.stepWrap}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
        <View style={[styles.bigIcon, { backgroundColor: theme.emerald + "22", borderColor: theme.emerald + "55" }]}>
          <Icon size={48} color={theme.emeraldBright} />
        </View>
        <Text style={styles.bigHeadline}>{slide.headline}</Text>
        <Text style={styles.bigBody}>{slide.body}</Text>
        <View style={styles.slidesDots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.slideDot, i === idx && styles.slideDotActive]} />
          ))}
        </View>
      </View>
      <Pressable
        onPress={() => (idx < slides.length - 1 ? setIdx(idx + 1) : onNext())}
        style={({ pressed }) => [styles.primaryBtn, pressed && { transform: [{ scale: 0.99 }] }]}
      >
        <Text style={styles.primaryBtnText}>{idx < slides.length - 1 ? "NEXT" : "GET STARTED"}</Text>
        <ArrowRight size={16} color="#06070D" />
      </Pressable>
    </View>
  );
}

function SignInStep({
  onApple,
  onGoogle,
  onEmail,
  isSigningIn,
  error,
}: {
  onApple: () => void;
  onGoogle: () => void;
  onEmail: () => void;
  isSigningIn: boolean;
  error: string | null;
}) {
  return (
    <View style={styles.stepWrap}>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        <View style={[styles.bigIcon, { backgroundColor: theme.gold + "1A", borderColor: theme.gold + "55", alignSelf: "center" }]}>
          <Sparkles size={42} color={theme.goldBright} />
        </View>
        <Text style={[styles.bigHeadline, { textAlign: "center" }]}>Save your progress</Text>
        <Text style={[styles.bigBody, { textAlign: "center" }]}>Sign in so your streak, coins and rewards stick across devices.</Text>

        {error ? (
          <View style={styles.errBox}>
            <Text style={styles.errText}>{error}</Text>
          </View>
        ) : null}

        <View style={{ gap: 12, marginTop: 32 }}>
          <Pressable
            disabled={isSigningIn}
            onPress={onApple}
            style={({ pressed }) => [styles.appleBtn, isSigningIn && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.99 }] }]}
          >
            <Apple size={18} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.appleBtnText}>Continue with Apple</Text>
          </Pressable>
          <Pressable
            disabled={isSigningIn}
            onPress={onGoogle}
            style={({ pressed }) => [styles.googleBtn, isSigningIn && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.99 }] }]}
          >
            <View style={styles.googleG}><Text style={styles.googleGText}>G</Text></View>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </Pressable>
          <Pressable
            disabled={isSigningIn}
            onPress={onEmail}
            style={({ pressed }) => [styles.emailBtn, isSigningIn && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.99 }] }]}
          >
            <Mail size={18} color={theme.text} />
            <Text style={styles.emailBtnText}>Continue with Email</Text>
          </Pressable>
        </View>

        {isSigningIn ? <ActivityIndicator color={theme.goldBright} style={{ marginTop: 18 }} /> : null}
      </View>
      <Text style={styles.legal}>By continuing you agree to our Terms & Privacy Policy.</Text>
    </View>
  );
}

function ProfileStep({
  username,
  setUsername,
  firstName,
  setFirstName,
  avatarIdx,
  setAvatarIdx,
  valid,
  onNext,
}: {
  username: string;
  setUsername: (v: string) => void;
  firstName: string;
  setFirstName: (v: string) => void;
  avatarIdx: number;
  setAvatarIdx: (i: number) => void;
  valid: boolean | null;
  onNext: () => void;
}) {
  const avatar = AVATARS[avatarIdx];
  const initials = (firstName || username || "S").slice(0, 1).toUpperCase();
  const tint = useMemo(() => {
    const colors = [theme.emerald, theme.gold, theme.sapphire, theme.ruby, "#A78BFA", "#FB923C"];
    return colors[avatarIdx % colors.length];
  }, [avatarIdx]);
  return (
    <ScrollView contentContainerStyle={[styles.stepWrap, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      <Text style={styles.bigHeadline}>You</Text>
      <Text style={styles.bigBody}>Pick a handle and a vibe. You can change these any time.</Text>

      <Pressable
        onPress={() => setAvatarIdx((avatarIdx + 1) % AVATARS.length)}
        style={[styles.avatarBubble, { backgroundColor: tint + "33", borderColor: tint }]}
      >
        <Text style={[styles.avatarLetter, { color: tint }]}>{initials}</Text>
        <View style={styles.avatarHint}>
          <Text style={styles.avatarHintText}>TAP TO CYCLE</Text>
        </View>
      </Pressable>
      <Text style={styles.avatarSeed}>{avatar}</Text>

      <View style={{ gap: 10, marginTop: 24 }}>
        <View>
          <Text style={styles.fieldLabel}>USERNAME</Text>
          <View style={[styles.inputWrap, valid === false && { borderColor: theme.ruby }]}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              value={username}
              onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
              placeholder="yourname"
              placeholderTextColor={theme.textDim}
              autoCapitalize="none"
              style={[styles.input, { flex: 1, marginVertical: 0, borderWidth: 0, paddingLeft: 4 }]}
              maxLength={20}
            />
            {valid === true ? <Check size={16} color={theme.emeraldBright} /> : null}
          </View>
          {valid === false ? <Text style={styles.helpErr}>That handle is taken or invalid.</Text> : null}
        </View>
        <View>
          <Text style={styles.fieldLabel}>FIRST NAME (OPTIONAL)</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Optional"
            placeholderTextColor={theme.textDim}
            style={styles.input}
            maxLength={24}
          />
        </View>
      </View>

      <Pressable
        disabled={!valid}
        onPress={onNext}
        style={({ pressed }) => [styles.primaryBtn, { marginTop: 24 }, !valid && { opacity: 0.45 }, pressed && { transform: [{ scale: 0.99 }] }]}
      >
        <Text style={styles.primaryBtnText}>LOOKS GOOD</Text>
        <ArrowRight size={16} color="#06070D" />
      </Pressable>
    </ScrollView>
  );
}

function GoalStep({ goal, setGoal, onNext }: { goal: number; setGoal: (n: number) => void; onNext: () => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.bigHeadline}>Daily step goal</Text>
      <Text style={styles.bigBody}>Hit it to mint bonus coins. Most people pick 8,000.</Text>

      <View style={styles.goalDialWrap}>
        <View style={styles.goalDial}>
          <Text style={styles.goalDialNum}>{goal.toLocaleString()}</Text>
          <Text style={styles.goalDialLabel}>STEPS / DAY</Text>
        </View>
      </View>

      <View style={styles.goalChips}>
        {STEP_GOALS.map((g) => (
          <Pressable
            key={g}
            onPress={() => setGoal(g)}
            style={[styles.goalChip, goal === g && styles.goalChipActive]}
          >
            <Text style={[styles.goalChipText, goal === g && styles.goalChipTextActive]}>{(g / 1000).toFixed(0)}K</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      <Pressable onPress={onNext} style={({ pressed }) => [styles.primaryBtn, pressed && { transform: [{ scale: 0.99 }] }]}>
        <Text style={styles.primaryBtnText}>SET GOAL</Text>
        <ArrowRight size={16} color="#06070D" />
      </Pressable>
    </View>
  );
}

function TribeStep({ tribeId, setTribeId, cityId, onNext }: { tribeId?: string; setTribeId: (id: string) => void; cityId?: string; onNext: () => void }) {
  // Only show tribes scoped to the player's home city + shared crews.
  const list = useMemo(() => tribesForCity(cityId), [cityId]);
  const cityLabel = cityId ? CITY_BY_ID[cityId]?.name : undefined;
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.bigHeadline}>Pick your tribe</Text>
      <Text style={styles.bigBody}>
        {cityLabel
          ? `Tribes for ${cityLabel} + global crews. Your coins count toward your club in the weekly derby.`
          : "Your coins count toward your club in the weekly derby. Skip and we'll ask again later."}
      </Text>

      <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ paddingBottom: 12, gap: 8 }} showsVerticalScrollIndicator={false}>
        {list.map((t) => {
          const active = tribeId === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTribeId(t.id)}
              style={[styles.tribeRow, { borderColor: active ? t.primary : theme.borderSoft, backgroundColor: active ? t.primary + "22" : theme.bgCard }]}
            >
              <View style={[styles.tribeBadge, { backgroundColor: t.primary }]}>
                <Text style={styles.tribeEmoji}>{t.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tribeName}>{t.name}</Text>
                <Text style={styles.tribeArea}>{t.area}</Text>
              </View>
              {active ? (
                <View style={styles.checkBubble}>
                  <Check size={12} color="#06070D" strokeWidth={3} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable onPress={onNext} style={({ pressed }) => [styles.primaryBtn, !tribeId && { opacity: 0.7 }, pressed && { transform: [{ scale: 0.99 }] }]}>
        <Text style={styles.primaryBtnText}>{tribeId ? "JOIN TRIBE" : "SKIP FOR NOW"}</Text>
        <ArrowRight size={16} color="#06070D" />
      </Pressable>
    </View>
  );
}

function ReferralStep({
  code,
  setCode,
  valid,
  onNext,
}: {
  code: string;
  setCode: (v: string) => void;
  valid: boolean | null;
  onNext: () => void;
}) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.bigHeadline}>Got a code?</Text>
      <Text style={styles.bigBody}>Got invited by a friend? Enter their code and you both get +500 coins.</Text>

      <View style={{ marginTop: 24 }}>
        <Text style={styles.fieldLabel}>REFERRAL CODE</Text>
        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          placeholder="ABC123"
          placeholderTextColor={theme.textDim}
          autoCapitalize="characters"
          maxLength={10}
          style={[styles.input, valid === false && { borderColor: theme.ruby }]}
        />
        {valid === true ? <Text style={styles.helpOk}>Valid code · +500 coins coming your way</Text> : null}
        {valid === false ? <Text style={styles.helpErr}>That code doesn't look right.</Text> : null}
      </View>

      <View style={{ flex: 1 }} />
      <Pressable onPress={onNext} style={({ pressed }) => [styles.primaryBtn, pressed && { transform: [{ scale: 0.99 }] }]}>
        <Text style={styles.primaryBtnText}>{valid ? "APPLY CODE" : "SKIP"}</Text>
        <ArrowRight size={16} color="#06070D" />
      </Pressable>
    </View>
  );
}

function PermissionStep({
  icon: Icon,
  tint,
  headline,
  body,
  preview,
  ctaLabel,
  onAllow,
  onSkip,
}: {
  icon: typeof Footprints;
  tint: string;
  headline: string;
  body: string;
  preview: React.ReactNode;
  ctaLabel: string;
  onAllow: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={styles.stepWrap}>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 8 }}>
        <View style={[styles.bigIcon, { backgroundColor: tint + "22", borderColor: tint + "55", alignSelf: "center" }]}>
          <Icon size={42} color={tint} />
        </View>
        <Text style={[styles.bigHeadline, { textAlign: "center" }]}>{headline}</Text>
        <Text style={[styles.bigBody, { textAlign: "center" }]}>{body}</Text>
        <View style={styles.previewCard}>{preview}</View>
      </View>
      <View style={{ gap: 8 }}>
        <Pressable onPress={onAllow} style={({ pressed }) => [styles.primaryBtn, pressed && { transform: [{ scale: 0.99 }] }]}>
          <Text style={styles.primaryBtnText}>{ctaLabel}</Text>
        </Pressable>
        <Pressable onPress={onSkip} hitSlop={8}>
          <Text style={styles.notNow}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MotionStep({ onAllow, onSkip }: { onAllow: () => void; onSkip: () => void }) {
  return (
    <PermissionStep
      icon={Footprints}
      tint={theme.emeraldBright}
      headline="Count your steps"
      body="We use your phone's pedometer to credit coins for the walking you already do."
      preview={
        <View style={styles.previewRow}>
          <Footprints size={18} color={theme.emeraldBright} />
          <Text style={styles.previewTitle}>+50 coins · 5,000 steps today</Text>
        </View>
      }
      ctaLabel="ALLOW MOTION ACCESS"
      onAllow={onAllow}
      onSkip={onSkip}
    />
  );
}

function NotifStep({ onAllow, onSkip }: { onAllow: () => void; onSkip: () => void }) {
  return (
    <PermissionStep
      icon={Bell}
      tint={theme.goldBright}
      headline="Don't miss Power Hour"
      body="We'll ping you when 2× windows open, your streak's at risk, or your vault respawns."
      preview={
        <View style={[styles.previewRow, { flexDirection: "column", alignItems: "flex-start", gap: 4 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Zap size={14} color={theme.goldBright} />
            <Text style={styles.previewTitle}>Power Hour in 30 min · 2×</Text>
          </View>
          <Text style={styles.previewSub}>Drop everything — every vault pays double.</Text>
        </View>
      }
      ctaLabel="ENABLE NOTIFICATIONS"
      onAllow={onAllow}
      onSkip={onSkip}
    />
  );
}

function LocationStep({ onAllow, onSkip }: { onAllow: () => void; onSkip: () => void }) {
  return (
    <PermissionStep
      icon={MapPin}
      tint={theme.sapphire}
      headline="Find vaults near you"
      body="We only use your location while you're in the app to show vaults you can claim."
      preview={
        <View style={styles.mapPreview}>
          <View style={[styles.mapDot, { backgroundColor: theme.goldBright, top: 30, left: 60 }]} />
          <View style={[styles.mapDot, { backgroundColor: theme.emeraldBright, top: 60, left: 140 }]} />
          <View style={[styles.mapDot, { backgroundColor: theme.ruby, top: 90, left: 80 }]} />
          <View style={[styles.mapMe]} />
        </View>
      }
      ctaLabel="SHARE LOCATION"
      onAllow={onAllow}
      onSkip={onSkip}
    />
  );
}

function CityStep({
  cityId,
  setCityId,
  username,
  onNext,
}: {
  cityId: string | undefined;
  setCityId: (id: string) => void;
  username: string;
  onNext: () => void;
}) {
  const onShareRally = useCallback(async () => {
    const picked = cityId ? CITY_BY_ID[cityId] : undefined;
    if (!picked || cityId === LIVE_CITY_ID) return;
    const code = `STRIDE-${(username || "walker").replace(/\W+/g, "").toUpperCase().slice(0, 6)}`;
    const msg = `${flagEmoji(picked.countryCode)} Help open Stride in ${picked.name}! Every friend who joins with my code adds +50 votes — we both get 500 bonus coins.\n\nCode: ${code}\nhttps://rork.app/stride-quest?ref=${code}&city=${picked.id}`;
    try { await Share.share({ message: msg }); } catch (e) { console.log("[onboarding] share", e); }
  }, [cityId, username]);
  const [filter, setFilter] = useState<string>("");
  const items = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    );
  }, [filter]);
  const inLondon = cityId === LIVE_CITY_ID;
  const picked = cityId ? CITY_BY_ID[cityId] : undefined;

  return (
    <View style={styles.stepWrap}>
      <Text style={styles.bigHeadline}>{inLondon ? "You're in London \uD83C\uDDEC\uD83C\uDDE7" : "Where are you?"}</Text>
      <Text style={styles.bigBody}>
        {inLondon
          ? "London is live. Coins, vaults, the lot \u2014 hit the map and start hunting."
          : "Pick your city. We're live in London now \u2014 votes from your steps and shares decide which city opens next."}
      </Text>

      {picked && !inLondon ? (
        <>
          <View style={styles.pickedCard}>
            <Text style={{ fontSize: 40 }}>{flagEmoji(picked.countryCode)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickedName}>{picked.name}</Text>
              <Text style={styles.pickedSub}>{picked.country} \u00b7 {picked.tagline}</Text>
            </View>
            <View style={styles.waitlistChip}>
              <Text style={styles.waitlistChipText}>WAITLIST</Text>
            </View>
          </View>
          <Pressable
            onPress={onShareRally}
            style={({ pressed }) => [
              styles.primaryBtn,
              { marginTop: 10, backgroundColor: theme.emerald },
              pressed && { transform: [{ scale: 0.99 }] },
            ]}
          >
            <Text style={[styles.primaryBtnText, { color: "#06070D" }]}>
              INVITE FRIENDS \u2014 +50 VOTES EACH
            </Text>
          </Pressable>
          <Text style={[styles.bigBody, { fontSize: 11, marginTop: 6, textAlign: "center" }]}>
            Every step you walk + every friend you invite pushes {picked.name} up the global waitlist. You\u2019ll keep earning coins now \u2014 the map opens here when {picked.name} hits #1.
          </Text>
        </>
      ) : null}

      {!inLondon ? (
        <>
          <TextInput
            value={filter}
            onChangeText={setFilter}
            placeholder="Search city or country\u2026"
            placeholderTextColor={theme.textDim}
            style={[styles.input, { marginTop: 12 }]}
          />
          <ScrollView
            style={{ flex: 1, marginTop: 8 }}
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {items.map((c) => {
              const active = c.id === cityId;
              const isLive = c.status === "live";
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCityId(c.id)}
                  style={[styles.cityRow, active && styles.cityRowActive]}
                >
                  <Text style={{ fontSize: 22 }}>{flagEmoji(c.countryCode)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cityRowName}>{c.name}</Text>
                    <Text style={styles.cityRowSub}>{c.country}</Text>
                  </View>
                  {isLive ? (
                    <View style={styles.liveTag}>
                      <Text style={styles.liveTagText}>LIVE</Text>
                    </View>
                  ) : null}
                  {active ? <Check size={18} color={theme.goldBright} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <Pressable
        onPress={onNext}
        style={({ pressed }) => [styles.primaryBtn, pressed && { transform: [{ scale: 0.99 }] }]}
      >
        <Text style={styles.primaryBtnText}>
          {inLondon ? "PERFECT \u2014 LET'S GO" : picked ? `RALLY ${picked.name.toUpperCase()}` : "SKIP FOR NOW"}
        </Text>
        <ArrowRight size={16} color="#06070D" />
      </Pressable>
    </View>
  );
}

function WelcomeStep({ firstName, onFinish }: { firstName: string; onFinish: () => void }) {
  // Confetti — a few floating coins.
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rise, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [rise]);
  const handle = firstName.replace(/^@/, "").trim() || "walker";
  return (
    <View style={styles.stepWrap}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
        {/* floating coins */}
        {Array.from({ length: 10 }).map((_, i) => {
          const offsetX = ((i * 47) % SCREEN_W) - SCREEN_W / 2 + 20;
          const delay = (i * 0.1) % 1;
          return (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: SCREEN_W / 2 + offsetX,
                transform: [
                  {
                    translateY: rise.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, -300],
                    }),
                  },
                  {
                    rotate: rise.interpolate({
                      inputRange: [0, 1],
                      outputRange: [`${delay * 360}deg`, `${720 + delay * 360}deg`],
                    }),
                  },
                ],
                opacity: rise.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }),
              }}
            >
              <View style={styles.coinPip}>
                <Text style={styles.coinPipText}>£</Text>
              </View>
            </Animated.View>
          );
        })}
        <View style={[styles.bigIcon, { backgroundColor: theme.gold + "22", borderColor: theme.gold }]}>
          <Trophy size={48} color={theme.goldBright} />
        </View>
        <Text style={styles.bigHeadline}>You're in, {handle}.</Text>
        <Text style={styles.bigBody}>We dropped +100 coins in your wallet to get you walking. Find a vault, claim it, and your streak begins.</Text>
        <View style={styles.bonusPill}>
          <Coins size={14} color={theme.goldBright} />
          <Text style={styles.bonusPillText}>+100 welcome bonus</Text>
        </View>
      </View>
      <Pressable onPress={onFinish} style={({ pressed }) => [styles.primaryBtn, pressed && { transform: [{ scale: 0.99 }] }]}>
        <Text style={styles.primaryBtnText}>START WALKING</Text>
        <ArrowRight size={16} color="#06070D" />
      </Pressable>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  orb: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.2,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: { color: theme.textMuted, fontSize: 12, fontWeight: "900" as const, letterSpacing: 1.4 },
  dotsRow: { flexDirection: "row", gap: 6 },
  dot: {
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.surface,
  },
  dotActive: { backgroundColor: theme.goldBright, width: 28 },
  dotDone: { backgroundColor: theme.gold },

  content: { flex: 1 },

  stepWrap: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  splashWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  splashIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: theme.goldBright,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: theme.goldBright,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  splashWord: {
    color: theme.text,
    fontSize: 38,
    fontWeight: "900" as const,
    letterSpacing: 6,
  },
  splashTag: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: "800" as const,
    letterSpacing: 4,
    marginTop: 8,
  },

  bigIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 28,
  },
  bigHeadline: {
    color: theme.text,
    fontSize: 32,
    fontWeight: "900" as const,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  bigBody: {
    color: theme.textMuted,
    fontSize: 15,
    fontWeight: "500" as const,
    lineHeight: 22,
  },

  slidesDots: { flexDirection: "row", gap: 6, marginTop: 28 },
  slideDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.surface },
  slideDotActive: { backgroundColor: theme.emeraldBright, width: 24 },

  primaryBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.goldBright,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: {
    color: "#06070D",
    fontSize: 14,
    fontWeight: "900" as const,
    letterSpacing: 1.4,
  },
  appleBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#000000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  appleBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" as const },
  googleBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleG: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleGText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" as const },
  googleBtnText: { color: "#1A1A1A", fontSize: 15, fontWeight: "800" as const },
  emailBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emailBtnText: { color: theme.text, fontSize: 15, fontWeight: "800" as const },

  legal: {
    color: theme.textDim,
    fontSize: 11,
    textAlign: "center",
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  errBox: {
    backgroundColor: theme.ruby + "22",
    borderColor: theme.ruby + "66",
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  errText: { color: "#FEE2E2", fontSize: 13, fontWeight: "600" as const },
  helpErr: { color: theme.ruby, fontSize: 11, fontWeight: "700" as const, marginTop: 6 },
  helpOk: { color: theme.emeraldBright, fontSize: 11, fontWeight: "700" as const, marginTop: 6 },

  pickedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.goldBright,
    padding: 14,
    marginTop: 14,
  },
  pickedName: { color: theme.text, fontSize: 18, fontWeight: "900" as const },
  pickedSub: { color: theme.textMuted, fontSize: 11, fontWeight: "700" as const, marginTop: 2 },
  waitlistChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(244,208,63,0.16)",
  },
  waitlistChipText: { color: theme.goldBright, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.2 },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    marginBottom: 6,
  },
  cityRowActive: { borderColor: theme.goldBright, backgroundColor: "rgba(244,208,63,0.08)" },
  cityRowName: { color: theme.text, fontSize: 14, fontWeight: "800" as const },
  cityRowSub: { color: theme.textMuted, fontSize: 11, fontWeight: "600" as const, marginTop: 1 },
  liveTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: theme.emerald,
  },
  liveTagText: { color: "#06070D", fontSize: 9, fontWeight: "900" as const, letterSpacing: 1 },

  avatarBubble: {
    alignSelf: "center",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  avatarLetter: { fontSize: 44, fontWeight: "900" as const },
  avatarHint: {
    position: "absolute",
    bottom: -10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
  },
  avatarHintText: { color: theme.textMuted, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.2 },
  avatarSeed: {
    color: theme.textDim,
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 18,
  },

  fieldLabel: { color: theme.textDim, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.4, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
  },
  atSign: { color: theme.textMuted, fontSize: 16, fontWeight: "700" as const },
  input: {
    backgroundColor: theme.bgCard,
    color: theme.text,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: "600" as const,
    marginVertical: 4,
  },

  goalDialWrap: { alignItems: "center", marginVertical: 28 },
  goalDial: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 6,
    borderColor: theme.emerald,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bg,
  },
  goalDialNum: { color: theme.text, fontSize: 38, fontWeight: "900" as const, letterSpacing: -1 },
  goalDialLabel: { color: theme.textMuted, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.6, marginTop: 4 },
  goalChips: { flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  goalChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
  },
  goalChipActive: { backgroundColor: theme.emeraldBright, borderColor: theme.emeraldBright },
  goalChipText: { color: theme.textMuted, fontSize: 13, fontWeight: "900" as const, letterSpacing: 1 },
  goalChipTextActive: { color: "#06070D" },

  tribeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  tribeBadge: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  tribeEmoji: { fontSize: 16 },
  tribeName: { color: theme.text, fontSize: 14, fontWeight: "800" as const },
  tribeArea: { color: theme.textDim, fontSize: 11, marginTop: 2 },
  checkBubble: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.emeraldBright, alignItems: "center", justifyContent: "center" },

  previewCard: {
    marginTop: 24,
    padding: 14,
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  previewTitle: { color: theme.text, fontSize: 13, fontWeight: "800" as const },
  previewSub: { color: theme.textMuted, fontSize: 12, fontWeight: "500" as const, marginLeft: 22 },

  mapPreview: {
    height: 140,
    backgroundColor: theme.mapGrad1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    position: "relative",
  },
  mapDot: { position: "absolute", width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: theme.bg },
  mapMe: {
    position: "absolute",
    bottom: 40,
    left: "50%",
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.sapphire,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  notNow: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: "800" as const,
    textAlign: "center",
    padding: 12,
  },

  bonusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.gold + "22",
    borderWidth: 1,
    borderColor: theme.gold,
    marginTop: 20,
  },
  bonusPillText: { color: theme.goldBright, fontSize: 13, fontWeight: "900" as const, letterSpacing: 0.6 },

  coinPip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.goldBright,
    alignItems: "center",
    justifyContent: "center",
  },
  coinPipText: { color: "#06070D", fontSize: 12, fontWeight: "900" as const },

  sheetWrap: { position: "absolute", left: 0, right: 0, bottom: 0, top: 0, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.bgElev,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: theme.border,
    gap: 8,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { color: theme.text, fontSize: 18, fontWeight: "900" as const },
  toggleLink: { color: theme.goldBright, fontSize: 13, fontWeight: "800" as const, textAlign: "center", padding: 8 },
});
