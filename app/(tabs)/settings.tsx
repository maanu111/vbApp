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
  Image,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";

type SettingsTab = "business" | "tax" | "products";

interface Product {
  id: string;
  product_name: string;
  price: number;
  image_url: string | null;
}

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

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null
  );

  // Fetch settings on component mount
  useEffect(() => {
    fetchGstPercentage();
    fetchBusinessSettings();
    fetchProducts();
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

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, product_name, price, image_url")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      Alert.alert("Error", "Failed to fetch products");
    } finally {
      setProductsLoading(false);
    }
  };

  const deleteProduct = async (productId: string, productName: string) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${productName}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingProductId(productId);
            try {
              const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", productId);

              if (error) throw error;

              Alert.alert("Success", "Product deleted successfully!");
              fetchProducts(); // Refresh the list
            } catch (error) {
              console.error("Error deleting product:", error);
              Alert.alert("Error", "Failed to delete product");
            } finally {
              setDeletingProductId(null);
            }
          },
        },
      ]
    );
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

  const renderProductsSettings = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Manage Products</Text>
      <Text style={styles.subtitle}>Delete products from your menu</Text>

      {productsLoading ? (
        <ActivityIndicator size="large" color="#477998" style={styles.loader} />
      ) : products.length === 0 ? (
        <Text style={styles.noProducts}>No products found</Text>
      ) : (
        <ScrollView style={styles.productsList}>
          {products.map((product) => (
            <View key={product.id} style={styles.productItem}>
              <View style={styles.productInfo}>
                {product.image_url && (
                  <Image
                    source={{ uri: product.image_url }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.productDetails}>
                  <Text style={styles.productName}>{product.product_name}</Text>
                  <Text style={styles.productPrice}>₹{product.price}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteProduct(product.id, product.product_name)}
                disabled={deletingProductId === product.id}
              >
                {deletingProductId === product.id ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Side Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "business" && styles.activeTab]}
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
          style={[styles.tab, activeTab === "tax" && styles.activeTab]}
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

        <TouchableOpacity
          style={[styles.tab, activeTab === "products" && styles.activeTab]}
          onPress={() => setActiveTab("products")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "products" && styles.activeTabText,
            ]}
          >
            Products
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.contentContainer}>
        {activeTab === "business" && renderBusinessSettings()}
        {activeTab === "tax" && renderTaxSettings()}
        {activeTab === "products" && renderProductsSettings()}
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
  subtitle: {
    fontSize: 14,
    color: "#666",
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
    textAlignVertical: "top",
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
  // Products Tab Styles
  loader: {
    marginVertical: 20,
  },
  noProducts: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
    marginVertical: 20,
  },
  productsList: {
    maxHeight: 400,
  },
  productItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  productInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: "#477998",
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#DC3545",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
