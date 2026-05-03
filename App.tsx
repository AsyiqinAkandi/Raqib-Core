// App.tsx
import { SafeAreaProvider } from "react-native-safe-area-context";
import Router from "expo-router/entry";

export default function App() {
  return (
    <SafeAreaProvider>
      <Router />
    </SafeAreaProvider>
  );
}