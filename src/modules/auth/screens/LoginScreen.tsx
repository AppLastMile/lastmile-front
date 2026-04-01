import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
} from "react-native-reanimated";

import { useAuthSession } from "@/modules/auth/context/AuthSessionContext";

function getLoginErrorMessage(error: unknown) {
  if (!(error instanceof Error) || !error.message) {
    return "No fue posible iniciar sesion. Intenta nuevamente.";
  }

  try {
    const parsed = JSON.parse(error.message) as {
      message?: string | string[];
    };

    if (Array.isArray(parsed.message) && parsed.message.length > 0) {
      return parsed.message[0] ?? "Credenciales invalidas.";
    }

    if (typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    // If backend did not return JSON text, fallback to known messages below.
  }

  if (error.message.includes("Network request failed")) {
    return "No fue posible conectar con el backend. Verifica URL y red.";
  }

  return error.message;
}

export function LoginScreen() {
  const router = useRouter();
  const { currentUser, login } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isDisabled = useMemo(
    () => isSubmitting || !email.trim() || !password.trim(),
    [email, isSubmitting, password],
  );

  const handleLogin = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const matched = await login(email, password);
      router.replace(matched.redirectTo as never);
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      router.replace(currentUser.redirectTo as never);
    }
  }, [currentUser, router]);

  if (currentUser) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f6f9ff]">
      <View className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#c8dcff]" />
      <View className="absolute -right-24 top-32 h-72 w-72 rounded-full bg-[#ffe3bc]" />
      <View className="absolute bottom-16 left-8 h-40 w-40 rounded-full bg-[#d4ffe6]" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 px-6 pb-6"
      >
        <Animated.View
          entering={FadeInDown.duration(550)}
          className="mt-8 items-center"
        >
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-[#e8f0ff]">
            <FontAwesome5 color="#1f5fe0" name="bolt" size={32} />
          </View>
          <Text className="mt-4 text-4xl font-extrabold tracking-tight text-[#122648]">
            Last<Text className="text-[#1f5fe0]">Mile</Text>
          </Text>
          <Text className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#4a5f80]">
            Ayuda en tiempo real, impacto real.
          </Text>
        </Animated.View>

        <Animated.View
          className="mt-8 rounded-3xl border border-[#dfe8ff] bg-white/95 p-6"
          entering={FadeInDown.delay(100).duration(550)}
        >
          <Text className="text-2xl font-bold text-[#122648]">Bienvenido</Text>
          <Text className="mt-1 text-base text-[#4a5f80]">
            Ingresa tus credenciales para continuar
          </Text>

          <Text className="mt-6 mb-2 text-sm font-medium text-[#2d4468]">
            Correo Electrónico
          </Text>
          <TextInput
            autoCapitalize="none"
            className="rounded-xl border border-[#cad8f6] bg-[#f9fbff] px-4 py-3 text-[15px] text-[#13274a]"
            onChangeText={setEmail}
            placeholder="usuario@lastmile.com"
            placeholderTextColor="#88a0c6"
            value={email}
          />

          <Text className="mt-4 mb-2 text-sm font-medium text-[#2d4468]">
            Contraseña
          </Text>
          <View className="flex-row items-center rounded-xl border border-[#cad8f6] bg-[#f9fbff] px-4 py-3">
            <TextInput
              className="flex-1 text-[15px] text-[#13274a]"
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#88a0c6"
              secureTextEntry={!showPassword}
              value={password}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <FontAwesome5
                color="#88a0c6"
                name={showPassword ? "eye" : "eye-slash"}
                size={18}
              />
            </Pressable>
          </View>

          {error ? (
            <Animated.View
              entering={FadeInUp.duration(220)}
              layout={Layout.springify()}
            >
              <Text className="mt-3 text-sm text-[#c3324d]">{error}</Text>
            </Animated.View>
          ) : null}

          <Pressable
            className={`mt-6 rounded-2xl px-4 py-4 ${
              isDisabled ? "bg-[#9eb8e8]" : "bg-[#1f5fe0]"
            }`}
            disabled={isDisabled}
            onPress={handleLogin}
          >
            <Text className="text-center text-base font-bold uppercase tracking-wide text-white">
              {isSubmitting ? "Ingresando..." : "Entrar al Sistema"}
            </Text>
          </Pressable>

          <Pressable className="mt-4 opacity-60" disabled>
            <Text className="text-center text-sm font-semibold text-[#1f5fe0]">
              ¿OLVÍDASTE TU CLAVE?
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View
          className="mt-6 items-center"
          entering={FadeInDown.delay(200).duration(550)}
        >
          <Text className="text-sm text-[#4a5f80]">¿No tienes una cuenta?</Text>
          <Pressable className="opacity-60" disabled>
            <Text className="mt-2 text-base font-bold uppercase tracking-wide text-[#1f5fe0]">
              Crear Cuenta
            </Text>
          </Pressable>
        </Animated.View>

        <View className="mt-auto pt-6 pb-4 items-center">
          <Text className="text-xs font-medium tracking-wide text-[#8a9fb8]">
            DESARROLLADO POR{" "}
            <Text className="font-bold text-[#122648]">EQUIPO GÉNESIS</Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
