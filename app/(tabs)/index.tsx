import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useFonts, BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import { useCallback } from "react";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { supabase } from "@/lib/supabaseClient";
import { printDirectToThermal } from "@/lib/billGenerator";
import * as ImagePicker from "expo-image-picker";

SplashScreen.preventAutoHideAsync();
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Define Product type
interface Product {
  id: string;
  product_name: string;
  price: number;
  gst: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  quantity?: number;
}

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const [modalVisible, setModalVisible] = useState(false);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [gst, setGst] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [showBillButton, setShowBillButton] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Animation values
  const buttonScale = useSharedValue(1);
  const modalScale = useSharedValue(0);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: interpolate(modalScale.value, [0, 1], [0, 1]),
  }));

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      const initialQuantities: { [key: string]: number } = {};
      data?.forEach((product) => {
        initialQuantities[product.id] = 0;
      });
      setQuantities(initialQuantities);
    } catch (error) {
      console.error("Error fetching products:", error);
      Alert.alert("Error", "Failed to fetch products");
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1);
  };

  const openModal = () => {
    setModalVisible(true);
    modalScale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });
  };

  const closeModal = () => {
    modalScale.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      setModalVisible(false);
      setProductName("");
      setPrice("");
      setGst("");
      setImageUri(null);
    }, 200);
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission required",
        "You need to allow access to your photos"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Single unified create product function
  const handleCreateProduct = async () => {
    // Validation
    if (!productName || !price || !gst) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (!imageUri) {
      Alert.alert("Error", "Please select an image");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;

      // Upload image
      const fileExt = imageUri.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const formData = new FormData();
      formData.append("file", {
        uri: imageUri,
        name: fileName,
        type: `image/${fileExt}`,
      } as any);

      const uploadResponse = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/product-images/${filePath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: formData,
        }
      );

      if (uploadResponse.ok) {
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
        console.log("Image uploaded:", imageUrl);
      } else {
        Alert.alert("Error", "Image upload failed");
        setLoading(false);
        return;
      }

      // Insert product into database
      const { error } = await supabase.from("products").insert([
        {
          product_name: productName,
          price: parseFloat(price),
          gst: parseFloat(gst),
          image_url: imageUrl,
        },
      ]);

      if (error) throw error;

      Alert.alert("Success", "Product created successfully!");
      closeModal();
      fetchProducts();
    } catch (error) {
      console.error("Error creating product:", error);
      Alert.alert("Error", "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  const increaseQuantity = (productId: string, event: any) => {
    event.stopPropagation();
    setQuantities((prev) => {
      const newQuantities = {
        ...prev,
        [productId]: (prev[productId] || 0) + 1,
      };
      setShowBillButton(Object.values(newQuantities).some((qty) => qty > 0));
      return newQuantities;
    });
  };

  const decreaseQuantity = (productId: string, event: any) => {
    event.stopPropagation();
    setQuantities((prev) => {
      const newQuantities = {
        ...prev,
        [productId]: Math.max(0, (prev[productId] || 0) - 1),
      };
      setShowBillButton(Object.values(newQuantities).some((qty) => qty > 0));
      return newQuantities;
    });
  };

  const toggleProductSelection = (productId: string) => {
    setQuantities((prev) => {
      const currentQty = prev[productId] || 0;
      const newQuantities = {
        ...prev,
        [productId]: currentQty > 0 ? 0 : 1,
      };
      setShowBillButton(Object.values(newQuantities).some((qty) => qty > 0));
      return newQuantities;
    });
  };

  const handleCreateBill = async () => {
    const selectedItems = products
      .filter((product) => quantities[product.id] > 0)
      .map((product) => ({
        id: product.id,
        product_name: product.product_name,
        quantity: quantities[product.id],
        price: product.price,
        gst: product.gst,
      }));

    if (selectedItems.length === 0) {
      Alert.alert("Error", "No items selected");
      return;
    }

    const billNumber = Math.floor(Math.random() * 1000) + 1;

    try {
      await printDirectToThermal(selectedItems, billNumber);
      Alert.alert("Success", "Printing...");
    } catch (error) {
      Alert.alert("Error", "Failed to print");
    }
  };

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Vajan Badhao</Text>
        <AnimatedPressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={openModal}
          style={[styles.addButton, buttonAnimatedStyle]}
        >
          <Text style={styles.addButtonText}>Add +</Text>
        </AnimatedPressable>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No products yet</Text>
          </View>
        ) : (
          <View style={styles.productList}>
            {products.map((product) => {
              // Only show products with images
              if (!product.image_url) return null;

              return (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.productCard,
                    quantities[product.id] > 0 && styles.productCardSelected,
                  ]}
                  onPress={() => toggleProductSelection(product.id)}
                  activeOpacity={0.7}
                >
                  {/* Product Image */}
                  <View style={styles.productImagePlaceholder}>
                    <Image
                      source={{ uri: product.image_url }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  </View>

                  {/* Product Info Row */}
                  <View style={styles.productInfo}>
                    <View style={styles.productDetails}>
                      <Text style={styles.productName}>
                        {product.product_name}
                      </Text>
                      <Text style={styles.productPrice}>₹{product.price}</Text>
                      <Text style={styles.productGst}>GST: {product.gst}%</Text>
                    </View>

                    {/* Quantity Controls */}
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={(e) => decreaseQuantity(product.id, e)}
                      >
                        <Text style={styles.quantityButtonText}>−</Text>
                      </TouchableOpacity>

                      <Text style={styles.quantityText}>
                        {quantities[product.id] || 0}
                      </Text>

                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={(e) => increaseQuantity(product.id, e)}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, modalAnimatedStyle]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Product</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Product Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter product name"
                  value={productName}
                  onChangeText={setProductName}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter price"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>GST (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter GST percentage"
                  value={gst}
                  onChangeText={setGst}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Image Upload */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Product Image *</Text>
                <TouchableOpacity
                  style={styles.imagePlaceholder}
                  onPress={pickImage}
                >
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.uploadedImage}
                    />
                  ) : (
                    <>
                      <Text style={styles.imagePlaceholderIcon}>📷</Text>
                      <Text style={styles.imagePlaceholderText}>
                        Tap to select image
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeModal}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateProduct}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Floating Create Bill Button */}
      {showBillButton && (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity
            style={styles.createBillButton}
            onPress={handleCreateBill}
          >
            <Text style={styles.createBillButtonText}>Create Bill</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#477998",
    paddingTop: Platform.OS === "ios" ? 70 : 60,
    paddingBottom: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 40,
    letterSpacing: 1.5,
    color: "#FFFFFF",
  },
  addButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  addButtonText: {
    color: "#477998",
    fontSize: 16,
    fontWeight: "900",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 10,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    fontSize: 20,
    color: "#477998",
    fontWeight: "600",
  },
  productList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    width: "48%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  productCardSelected: {
    borderColor: "#477998",
    backgroundColor: "#F0F7FA",
  },
  productInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productDetails: {
    flex: 1,
  },
  productImagePlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#477998",
    marginBottom: 2,
  },
  productGst: {
    fontSize: 14,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quantityButton: {
    backgroundColor: "#477998",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  quantityButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#477998",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#477998",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: "#666",
    fontWeight: "300",
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
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
    backgroundColor: "#FAFAFA",
    color: "#333",
  },
  imagePlaceholder: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imagePlaceholderIcon: {
    fontSize: 40,
    marginBottom: 8,
    opacity: 0.5,
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  createButton: {
    backgroundColor: "#477998",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  floatingButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "transparent",
  },
  createBillButton: {
    backgroundColor: "#477998",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createBillButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
