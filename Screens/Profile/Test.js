import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform, Alert, Modal, FlatList, TouchableWithoutFeedback
} from 'react-native';
import axios from 'axios';
import {getUserId, getRestaurantId} from "../utils/getOwnerData";
import {onGetProductionUrl} from "../utils/ConstantFunctions";
import newstyles from "../newstyles";
import {Button, TextInput} from "react-native-paper";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import RemixIcon from "react-native-remix-icon";
import Icon from "react-native-vector-icons/MaterialIcons";

const RestaurantInfo = () => {
    const [restaurantData, setRestaurantData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [btnLoading, setBtnLoading] = useState(false);
    const [isEditable, setIsEditable] = useState(false);
    const [vegNonvegList, setVegNonvegList] = useState([]);
    const [vegModalVisible, setVegModalVisible] = useState(false);
    const [vegNonveg, setVegNonveg] = useState('nonveg');






    const fetchRestaurantInfo = async () => {
        try {
            let restaurantId = await getRestaurantId();;
            const userId = await getUserId();
            console.log("restaurantId-"+restaurantId)
            console.log("ownerId-"+userId)
            const response = await axios.post(onGetProductionUrl()+'/restaurant_info/view', {
                user_id: userId,
                restaurant_id: restaurantId,
            });

            if (response.data.st === 1) {
                console.log(response.data.data)
                setRestaurantData(response.data.data);
            } else {
                console.log('Error:', response.data.msg);
            }
        } catch (error) {
            console.log('Error fetching restaurant data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ActivityIndicator style={styles.loading} size="large" color="#0000ff" />;
    }

    if (!restaurantData) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load restaurant information.</Text>
            </View>
        );
    }

    const fetchVegNonvegList = async () => {
        try {
            const response = await axios.get(onGetProductionUrl()+'/get_veg_or_nonveg_list');
            if (response.data.st === 1) {
                const vegNonvegList = Object.entries(response.data.veg_or_nonveg_list).map(([key, value]) => ({
                    name: value,
                    key: key,
                }));
                setVegNonvegList(vegNonvegList);
            } else {
                Alert.alert('Error', 'Failed to fetch veg/non-veg options.');
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };



    const handleInputChange = (key, value) => {
        setRestaurantData({ ...restaurantData, [key]: value });
    };

    const handleUpdateRestaurantProfile = async () => {
        setBtnLoading(true);  // Show loading indicator
        try {
            console.log("restaurantData--"+JSON.stringify(restaurantData))
            const restaurantId = await getRestaurantId();;
            const userId = await getUserId();
            console.log("restaurantId-"+restaurantId)
            console.log("ownerId-"+userId)
            const response = await axios.post(onGetProductionUrl() + '/restaurant_info/update', {
                user_id: userId,
                restaurant_id: restaurantId,
                ...restaurantData,
            });

            if (response.data.st === 1) {
                alert('Profile updated successfully');
                setIsEditable(false);
            } else {
                console.log('Update Error:', response.data.msg);
            }
        } catch (error) {
            Alert.alert('Error', error.message);
            console.log('Error updating restaurant data:', error);
        }finally {
            setBtnLoading(false);  // Hide loading indicator
        }
    };

    useEffect(() => {
        fetchRestaurantInfo();
        // fetchVegNonvegList();
    }, []);

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView contentContainerStyle={newstyles.inner}>
                    <View style={styles.header}>
                        <Text style={styles.headerText}>Restaurant Profile</Text>
                        <TouchableOpacity onPress={() => setIsEditable(!isEditable)}>
                            <MaterialCommunityIcons name="pencil" size={24} color="#6200ee" />
                        </TouchableOpacity>
                    </View>
                    <Text style={newstyles.labelText}>Name:</Text>

                    <TextInput
                        placeholder="Name"
                        value={restaurantData.name}
                        onChangeText={(text) => handleInputChange('name', text)}
                        mode="outlined"
                        style={newstyles.input}
                        disabled={!isEditable}
                    />

                    <Text style={newstyles.labelText}>Type:</Text>
                    <TextInput
                        placeholder="Type"
                        value={restaurantData.restaurant_type}
                        onChangeText={(text) => handleInputChange('restaurant_type', text)}
                        mode="outlined"
                        style={newstyles.input}
                        disabled={!isEditable}
                    />

                    <Text style={newstyles.labelText}>FSSAI Number:</Text>
                    <TextInput
                        placeholder="FSSAI Number"
                        value={restaurantData.fssainumber}
                        onChangeText={(text) => handleInputChange('fssainumber', text)}
                        mode="outlined"
                        style={newstyles.input}
                        disabled={!isEditable}
                    />

                    <Text style={newstyles.labelText}>GST Number:</Text>
                    <TextInput
                        placeholder="GST Number"
                        value={restaurantData.gstnumber}
                        onChangeText={(text) => handleInputChange('gstnumber', text)}
                        mode="outlined"
                        style={newstyles.input}
                        disabled={!isEditable}
                    />

                    <Text style={newstyles.labelText}>Mobile:</Text>
                    <TextInput
                        placeholder="Mobile"
                        value={restaurantData.mobile}
                        onChangeText={(text) => handleInputChange('mobile', text)}
                        mode="outlined"
                        style={newstyles.input}
                        disabled={!isEditable}
                    />


                    <Text style={newstyles.labelText}>Select Veg/Non-Veg</Text>
                    <TouchableOpacity
                        disabled={!isEditable}
                        style={newstyles.selectModalPicker}

                        onPress={() => setVegModalVisible(true)}
                    >
                        <Text>
                            {restaurantData.veg_nonveg
                                ? `Selected: ${restaurantData.veg_nonveg}`
                                : 'Select Veg/Non-Veg'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={newstyles.labelText}>Service Charges:</Text>
                    <TextInput
                        placeholder="Service Charges"
                        value={restaurantData.service_charges}
                        onChangeText={(text) => handleInputChange('service_charges', text)}
                        mode="outlined"
                        style={newstyles.input}
                        disabled={!isEditable}
                    />

                    <Text style={newstyles.labelText}>GST:</Text>
                    <TextInput
                        placeholder="GST"
                        value={restaurantData.gst}
                        onChangeText={(text) => handleInputChange('gst', text)}
                        mode="outlined"
                        style={newstyles.input}
                        disabled={!isEditable}
                    />

                    <Text style={newstyles.labelText}>Address:</Text>
                    <TextInput
                        placeholder="Address"
                        value={restaurantData.address}
                        onChangeText={(text) => handleInputChange('address', text)}
                        mode="outlined"
                        style={newstyles.input}
                        disabled={!isEditable}
                        autoFocus={true}
                    />
                    {isEditable && (
                        <Button
                            mode="contained"
                            onPress={handleUpdateRestaurantProfile}
                            loading={btnLoading} disabled={btnLoading}

                            style={[newstyles.submitButton, { marginBottom: 20 }]}
                            icon={() => (
                                <RemixIcon name="ri-checkbox-circle-line" size={20} color="#fff" />
                            )}
                        >
                            Update
                        </Button>
                    )}
                    {/* Footer */}
                    <View style={newstyles.footerTextContainer}>
                        <Text style={newstyles.footerText}>Shekru Labs Pvt Ltd</Text>
                        <Text style={newstyles.footerText}>v1.0</Text>
                    </View>

                    {/* Modal for veg/non-veg selection */}
                    <Modal
                        transparent={true}
                        animationType="slide"
                        visible={vegModalVisible}
                        onRequestClose={() => setVegModalVisible(false)}
                    >
                        <View style={newstyles.selectModalContainer}>
                            <View style={newstyles.selectModalContent}>
                                {/* Modal Header with Title and Close Button */}
                                <View style={newstyles.selectModalHeader}>
                                    <Text style={newstyles.selectModalTitle}>Select Veg/Non-Veg</Text>
                                    <TouchableOpacity onPress={() => setVegModalVisible(false)}>
                                        <Icon name="close" size={24} color="#000" />
                                    </TouchableOpacity>
                                </View>

                                <FlatList
                                    data={vegNonvegList}
                                    keyExtractor={(item) => item.key.toString()}
                                    renderItem={({ item }) => (
                                        <TouchableWithoutFeedback
                                            onPress={() => {
                                                setVegNonveg(item.name);
                                                // handleInputChange('veg_nonveg', item.name)
                                                setVegModalVisible(false);
                                            }}
                                        >
                                            <View style={newstyles.selectModalItem}>
                                                <Text>{item.name}</Text>
                                            </View>
                                        </TouchableWithoutFeedback>
                                    )}
                                />
                            </View>
                        </View>
                    </Modal>
                </ScrollView>
            </KeyboardAvoidingView>


        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        margin: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
        marginTop: 8,
    },
    value: {
        fontSize: 16,
        color: '#666666',
        marginBottom: 8,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: 'red',
    },
});

export default RestaurantInfo;
