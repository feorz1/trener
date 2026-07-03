import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input, Navigation, TextArea, Variant } from "@/components/ui";
import { useClient, useClientActions } from "@/data";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { theme } from "@/theme";
import type { ClientGender } from "@/types";

type ClientEditForm = {
  gender: ClientGender;
  name: string;
  phonePrefix: string;
  phone: string;
  email: string;
  birthDate: string;
  telegram: string;
  goal: string;
  notes: string;
};

const emptyForm: ClientEditForm = {
  gender: "male",
  name: "",
  phonePrefix: "+7",
  phone: "",
  email: "",
  birthDate: "",
  telegram: "",
  goal: "",
  notes: ""
};

const CLIENT_EDIT_TEXT_AREA_KEYBOARD_OFFSET = theme.sizes.textAreaFieldMinHeight + theme.spacing.lg;

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function splitPhone(phone?: string) {
  const trimmed = phone?.trim();
  if (!trimmed) return { phonePrefix: "+7", phone: "" };
  const match = trimmed.match(/^(\+\d+)\s*(.*)$/);
  return {
    phonePrefix: match?.[1] ?? "+7",
    phone: match?.[2]?.trim() ?? trimmed
  };
}

function toForm(client: NonNullable<ReturnType<typeof useClient>["client"]>): ClientEditForm {
  const phoneParts = splitPhone(client.phone);
  return {
    gender: client.gender ?? "male",
    name: client.name,
    phonePrefix: phoneParts.phonePrefix,
    phone: phoneParts.phone,
    email: client.email ?? "",
    birthDate: client.birthDate ?? "",
    telegram: client.telegram ?? "",
    goal: client.goal ?? "",
    notes: client.notes ?? ""
  };
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getFormError(form: ClientEditForm) {
  if (!form.name.trim()) return "Имя обязательно.";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Проверьте email.";
  if (form.phone.trim() && form.phone.trim().length < 5) return "Проверьте телефон.";
  if (form.birthDate.trim() && Number.isNaN(Date.parse(form.birthDate.trim()))) return "Проверьте дату рождения.";
  if (form.notes.length > 600) return "Заметки слишком длинные.";
  return null;
}

export default function EditClientScreen() {
  const { clientId: rawClientId } = useLocalSearchParams<{ clientId?: string | string[] }>();
  const clientId = firstParam(rawClientId);
  const { client, notFound } = useClient(clientId);
  const clients = useClientActions();
  const { scrollProps } = useConditionalScroll();
  const keyboardInset = useKeyboardInset();
  const keyboardVisible = keyboardInset > theme.spacing[0];
  const [form, setForm] = useState<ClientEditForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (client) setForm(toForm(client));
  }, [client]);

  const formError = useMemo(() => getFormError(form), [form]);
  const canSave = Boolean(client && !formError && !saving);

  const updateForm = <K extends keyof ClientEditForm>(key: K, value: ClientEditForm[K]) => {
    setSubmitError("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!clientId || !client || formError || saving) return;

    setSaving(true);
    setSubmitError("");
    try {
      await clients.update(clientId, {
        gender: form.gender,
        name: form.name.trim(),
        phone: optional([form.phonePrefix, form.phone].filter(Boolean).join(" ")),
        email: optional(form.email),
        birthDate: optional(form.birthDate),
        telegram: optional(form.telegram),
        goal: optional(form.goal) ?? "",
        notes: optional(form.notes) ?? ""
      });
      router.back();
    } catch {
      setSubmitError("Не удалось сохранить изменения.");
    } finally {
      setSaving(false);
    }
  };

  if (notFound || !client) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <Navigation title="Данные клиента" onBack={() => router.back()} />
        <View style={styles.state}>
          <Text style={styles.stateTitle}>Клиент не найден</Text>
          <Button label="Назад" type="secondary" size="large" width="fill" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Данные клиента" onBack={() => router.back()} />

      <KeyboardAwareScrollView
        bottomOffset={CLIENT_EDIT_TEXT_AREA_KEYBOARD_OFFSET}
        contentContainerStyle={styles.content}
        extraKeyboardSpace={CLIENT_EDIT_TEXT_AREA_KEYBOARD_OFFSET}
        keyboardShouldPersistTaps="handled"
        mode="insets"
        style={styles.keyboardAwareBody}
        {...scrollProps}
        scrollEnabled
      >
        <Variant
          label="Пол"
          items={[
            { key: "male", label: "Мужской" },
            { key: "female", label: "Женский" }
          ]}
          value={form.gender}
          columns={2}
          width="fill"
          onChange={(value) => updateForm("gender", value)}
        />
        <Input label="Имя" value={form.name} width="fill" state={!form.name.trim() ? "error" : "default"} message={!form.name.trim() ? "Имя обязательно" : undefined} onChangeText={(value) => updateForm("name", value)} />
        <Input
          label="Телефон"
          value={form.phone}
          prefixValue={form.phonePrefix}
          width="fill"
          doubleField
          keyboardType="phone-pad"
          showMessage={false}
          onChangePrefixText={(value) => updateForm("phonePrefix", value)}
          onChangeText={(value) => updateForm("phone", value)}
        />
        <Input label="Telegram" value={form.telegram} width="fill" autoCapitalize="none" showMessage={false} onChangeText={(value) => updateForm("telegram", value)} />
        <Input label="Цель" value={form.goal} width="fill" showMessage={false} onChangeText={(value) => updateForm("goal", value)} />
        <TextArea label="Заметки" value={form.notes} width="fill" showMessage={false} onChangeText={(value) => updateForm("notes", value)} />
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
      </KeyboardAwareScrollView>

      {keyboardVisible ? null : (
        <View style={styles.footer}>
          <Button label="Сохранить" type="primary" size="large" width="fill" state={saving ? "loading" : canSave ? "active" : "disabled"} onPress={save} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  keyboardAwareBody: {
    flex: 1
  },
  content: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  errorText: {
    ...theme.typography.body.sm,
    paddingHorizontal: theme.spacing.lg,
    color: theme.colors.status.negative
  },
  state: {
    flex: 1,
    justifyContent: "center",
    gap: theme.spacing.lg,
    padding: theme.spacing.lg
  },
  stateTitle: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink,
    textAlign: "center"
  }
});
