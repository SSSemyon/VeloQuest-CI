import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { signInWithGoogle } from '../auth/googleAuth';
import { signInWithVk } from '../auth/vkAuth';
import { supabase } from '../lib/supabase';
import { useTheme, useThemedStyles } from '../theme';

const GREEN = '#174C2C';
const INK = '#141714';
const MUTED = '#696D68';
const LINE = '#D9D8D0';
const IVORY = '#FBFAF6';

const PASSWORD_RECOVERY_REDIRECT = 'veloquest://auth/callback';

export function AuthScreen() {
  const styles = useThemedStyles(baseStyles);
  const { colors, dark } = useTheme();
  const GREEN = colors.green;
  const iconColor = dark ? colors.muted : '#737772';
  const placeholderColor = dark ? '#7E8981' : '#989B96';
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 6) {
      setError('Укажи email и пароль не короче 6 символов.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'signIn') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: normalizedEmail, password });
        if (signUpError) throw signUpError;
        if (!data.session) setMessage('Аккаунт создан. Подтверди email по письму и затем войди.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось выполнить вход.');
    } finally {
      setBusy(false);
    }
  };

  const authenticateWithGoogle = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await signInWithGoogle();
      if (result.kind === 'cancelled') {
        setMessage('Вход через Google отменён.');
      } else if (result.kind === 'error') {
        setError('Не удалось войти через Google. Повтори попытку.');
      }
    } catch {
      setError('Не удалось войти через Google. Повтори попытку.');
    } finally {
      setBusy(false);
    }
  };

  const authenticateWithVk = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await signInWithVk();
      if (result.kind === 'cancelled') {
        setMessage('Вход через VK отменён.');
      } else if (result.kind === 'error') {
        setError('Не удалось войти через VK. Повтори попытку.');
      }
    } catch {
      setError('Не удалось войти через VK. Повтори попытку.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Сначала укажи email.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: PASSWORD_RECOVERY_REDIRECT,
    });
    setBusy(false);
    if (resetError) setError(resetError.message);
    else setMessage('Ссылка для восстановления отправлена на email.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.logoLockup}>
        <Image source={require('../../assets/veloquest-icon.png')} style={styles.logo} />
        <Text style={styles.brand}>VeloQuest</Text>
      </View>

      <Text style={styles.title}>{mode === 'signIn' ? 'С возвращением.' : 'Создай аккаунт.'}</Text>
      <Text style={styles.subtitle}>{mode === 'signIn' ? 'Рады видеть тебя снова!' : 'Один аккаунт — весь твой прогресс и территория.'}</Text>

      <Text style={styles.label}>Email</Text>
      <View style={styles.inputShell}>
        <Ionicons name="mail-outline" size={19} color={iconColor} />
        <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="email@example.com" placeholderTextColor={placeholderColor} style={styles.input} />
      </View>

      <Text style={styles.label}>Пароль</Text>
      <View style={styles.inputShell}>
        <Ionicons name="lock-closed-outline" size={19} color={iconColor} />
        <TextInput value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" placeholder="••••••••" placeholderTextColor={placeholderColor} style={styles.input} />
        <Pressable hitSlop={10} onPress={() => setShowPassword((value) => !value)}>
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={iconColor} />
        </Pressable>
      </View>

      {mode === 'signIn' && <Pressable onPress={() => { void resetPassword(); }} style={styles.forgot}><Text style={styles.forgotText}>Забыли пароль?</Text></Pressable>}

      {error && <View style={styles.errorBox}><Ionicons name="alert-circle" size={18} color="#9A3D25" /><Text style={styles.errorText}>{error}</Text></View>}
      {message && <View style={styles.messageBox}><Ionicons name="mail-unread-outline" size={18} color={GREEN} /><Text style={styles.messageText}>{message}</Text></View>}

      <Pressable disabled={busy} onPress={() => { void submit(); }} style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed, busy && styles.disabled]}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{mode === 'signIn' ? 'Войти' : 'Создать аккаунт'}</Text>}
      </Pressable>

      <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>или</Text><View style={styles.dividerLine} /></View>
      <Pressable disabled={busy} onPress={() => { void authenticateWithGoogle(); }} style={({ pressed }) => [styles.provider, pressed && styles.providerPressed, busy && styles.disabled]}>
        <Ionicons name="logo-google" size={19} color={GREEN} />
        <Text style={styles.providerText}>Продолжить с Google</Text>
      </Pressable>
      <Pressable disabled={busy} onPress={() => { void authenticateWithVk(); }} style={({ pressed }) => [styles.provider, pressed && styles.providerPressed, busy && styles.disabled]}>
        <Ionicons name="logo-vk" size={19} color={GREEN} />
        <Text style={styles.providerText}>Продолжить с VK</Text>
      </Pressable>
      <Pressable disabled={busy} onPress={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError(null); setMessage(null); }} style={styles.secondary}>
        <Ionicons name={mode === 'signIn' ? 'person-outline' : 'log-in-outline'} size={19} color={GREEN} />
        <Text style={styles.secondaryText}>{mode === 'signIn' ? 'Создать аккаунт' : 'Уже есть аккаунт? Войти'}</Text>
      </Pressable>

      <Text style={styles.legal}>Продолжая, вы соглашаетесь с{`\n`}Условиями использования и Политикой конфиденциальности</Text>
    </ScrollView>
  );
}

export function PasswordResetScreen({ onComplete }: { onComplete: () => void }) {
  const styles = useThemedStyles(baseStyles);
  const { colors, dark } = useTheme();
  const iconColor = dark ? colors.muted : '#737772';
  const placeholderColor = dark ? '#7E8981' : '#989B96';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (password.length < 6) {
      setError('Новый пароль должен содержать не меньше 6 символов.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось обновить пароль.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.logoLockup}>
        <Image source={require('../../assets/veloquest-icon.png')} style={styles.logo} />
        <Text style={styles.brand}>VeloQuest</Text>
      </View>

      <Text style={styles.title}>Новый пароль.</Text>
      <Text style={styles.subtitle}>Задай новый пароль для своего аккаунта VeloQuest.</Text>

      <Text style={styles.label}>Новый пароль</Text>
      <View style={styles.inputShell}>
        <Ionicons name="lock-closed-outline" size={19} color={iconColor} />
        <TextInput value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" placeholder="Не меньше 6 символов" placeholderTextColor={placeholderColor} style={styles.input} />
        <Pressable hitSlop={10} onPress={() => setShowPassword((value) => !value)}>
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={iconColor} />
        </Pressable>
      </View>

      <Text style={styles.label}>Повтори пароль</Text>
      <View style={styles.inputShell}>
        <Ionicons name="shield-checkmark-outline" size={19} color={iconColor} />
        <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} autoCapitalize="none" placeholder="Повтори новый пароль" placeholderTextColor={placeholderColor} style={styles.input} />
      </View>

      {error && <View style={styles.errorBox}><Ionicons name="alert-circle" size={18} color="#9A3D25" /><Text style={styles.errorText}>{error}</Text></View>}

      <Pressable disabled={busy} onPress={() => { void submit(); }} style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed, busy && styles.disabled]}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Сохранить новый пароль</Text>}
      </Pressable>
    </ScrollView>
  );
}

const baseStyles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 26, paddingBottom: 30, backgroundColor: IVORY },
  logoLockup: { alignItems: 'center', marginTop: 26, marginBottom: 37 },
  logo: { width: 98, height: 98, borderRadius: 49 },
  brand: { marginTop: 7, color: GREEN, fontSize: 27, fontWeight: '900', letterSpacing: -0.9 },
  title: { color: INK, fontSize: 31, lineHeight: 36, fontWeight: '800', letterSpacing: -1.2, textAlign: 'center' },
  subtitle: { color: MUTED, fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 30, textAlign: 'center' },
  label: { color: INK, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  inputShell: { minHeight: 54, paddingHorizontal: 14, marginBottom: 18, borderRadius: 13, borderWidth: 1, borderColor: '#BFC1BC', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, height: 52, color: INK, fontSize: 15, paddingVertical: 0 },
  forgot: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 19, paddingVertical: 5 },
  forgotText: { color: GREEN, fontSize: 12, fontWeight: '700' },
  errorBox: { flexDirection: 'row', gap: 9, padding: 12, borderRadius: 12, backgroundColor: '#FAEAE4', marginBottom: 12 },
  errorText: { flex: 1, color: '#7D3827', fontSize: 12, lineHeight: 17 },
  messageBox: { flexDirection: 'row', gap: 9, padding: 12, borderRadius: 12, backgroundColor: '#EAF0E4', marginBottom: 12 },
  messageText: { flex: 1, color: GREEN, fontSize: 12, lineHeight: 17 },
  primary: { minHeight: 56, borderRadius: 13, paddingHorizontal: 20, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  primaryPressed: { backgroundColor: '#113C22' },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 20 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: LINE },
  dividerText: { color: MUTED, fontSize: 13 },
  provider: { minHeight: 51, marginBottom: 12, borderRadius: 13, borderWidth: 1, borderColor: GREEN, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  providerPressed: { backgroundColor: '#F0F4ED' },
  providerText: { color: GREEN, fontSize: 14, fontWeight: '700' },
  secondary: { minHeight: 51, borderRadius: 13, borderWidth: 1, borderColor: GREEN, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: GREEN, fontSize: 14, fontWeight: '700' },
  legal: { color: '#777B76', fontSize: 10, lineHeight: 17, textAlign: 'center', marginTop: 31 },
});
