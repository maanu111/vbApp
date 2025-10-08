import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";

type SettingsTab = "business" | "tax";

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("business");
  
  // GST Settings State
  const [gstPercentage, setGstPercentage] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedGst, setSavedGst] = useState<number | null>(null);

  // Business Settings State
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [businessLoading, setBusinessLoading] = useState(false);
  const [savedBusiness, setSavedBusiness] = useState<any>(null);

  // Fetch settings on component mount
  useEffect(() => {
    fetchGstPercentage();
    fetchBusinessSettings();
  }, []);

  const fetchGstPercentage = async () => {
    try {
      const { data, error } = await supabase
        .from("gst")
        .select("percentage")
        .eq("id", 1)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSavedGst(data.percentage);
        setGstPercentage(data.percentage.toString());
      }
    } catch (error) {
      console.error("Error fetching GST:", error);
      Alert.alert("Error", "Failed to fetch GST percentage");
    }
  };

  const fetchBusinessSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSavedBusiness(data);
        setBusinessName(data.business_name || "");
        setAddress(data.address || "");
        setPhoneNumber(data.phone_number || "");
      }
    } catch (error) {
      console.error("Error fetching business settings:", error);
      Alert.alert("Error", "Failed to fetch business settings");
    }
  };

  const saveGstPercentage = async () => {
    if (!gstPercentage) {
      Alert.alert("Error", "Please enter GST percentage");
      return;
    }

    const gstValue = parseFloat(gstPercentage);
    if (isNaN(gstValue) || gstValue < 0 || gstValue > 100) {
      Alert.alert("Error", "Please enter a valid GST percentage (0-100)");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("gst").upsert(
        {
          id: 1,
          percentage: gstValue,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

      if (error) throw error;

      setSavedGst(gstValue);
      Alert.alert("Success", "GST percentage saved successfully!");
    } catch (error) {
      console.error("Error saving GST:", error);
      Alert.alert("Error", "Failed to save GST percentage");
    } finally {
      setLoading(false);
    }
  };

  const saveBusinessSettings = async () => {
    if (!businessName.trim()) {
      Alert.alert("Error", "Please enter business name");
      return;
    }

    if (!address.trim()) {
      Alert.alert("Error", "Please enter address");
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert("Error", "Please enter phone number");
      return;
    }

    setBusinessLoading(true);

    try {
      const { error } = await supabase.from("business_settings").upsert(
        {
          id: 1,
          business_name: businessName.trim(),
          address: address.trim(),
          phone_number: phoneNumber.trim(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

      if (error) throw error;

      setSavedBusiness({
        business_name: businessName,
        address: address,
        phone_number: phoneNumber,
      });
      Alert.alert("Success", "Business settings saved successfully!");
    } catch (error) {
      console.error("Error saving business settings:", error);
      Alert.alert("Error", "Failed to save business settings");
    } finally {
      setBusinessLoading(false);
    }
  };

  const renderBusinessSettings = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Business Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Business Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter business name"
          value={businessName}
          onChangeText={setBusinessName}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Enter business address"
          value={address}
          onChangeText={setAddress}
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter phone number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          placeholderTextColor="#999"
        />
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={saveBusinessSettings}
        disabled={businessLoading}
      >
        {businessLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save Business Info</Text>
        )}
      </TouchableOpacity>

      {savedBusiness && (
        <Text style={styles.currentSetting}>
          Current: {savedBusiness.business_name}
        </Text>
      )}
    </View>
  );

  const renderTaxSettings = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Tax Settings</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>GST Percentage (%)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter GST percentage"
          value={gstPercentage}
          onChangeText={setGstPercentage}
          keyboardType="decimal-pad"
          placeholderTextColor="#999"
        />
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={saveGstPercentage}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save GST</Text>
        )}
      </TouchableOpacity>

      {savedGst !== null && (
        <Text style={styles.currentSetting}>Current GST: {savedGst}%</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      
      {/* Side Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "business" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("business")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "business" && styles.activeTabText,
            ]}
          >
            Business
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "tax" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("tax")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "tax" && styles.activeTabText,
            ]}
          >
            Tax
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.contentContainer}>
        {activeTab === "business" && renderBusinessSettings()}
        {activeTab === "tax" && renderTaxSettings()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#477998",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  activeTabText: {
    color: "#477998",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabContent: {
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#477998",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#333",
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: "#477998",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  currentSetting: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
});