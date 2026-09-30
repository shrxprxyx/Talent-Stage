import { Text, View, Pressable } from "react-native";

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-4xl font-bold text-primary">
        TalentStage
      </Text>

      <Text className="mt-3 text-center text-lg text-foreground">
        NativeWind is working!
      </Text>

      <Text className="mt-2 text-center text-muted-foreground">
        Your TalentStage design system is active.
      </Text>

      <Pressable className="mt-8 rounded-lg bg-primary px-6 py-3">
        <Text className="font-semibold text-primary-foreground">
          Get Started
        </Text>
      </Pressable>
    </View>
  );
}