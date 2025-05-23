import React, {useEffect, useState} from 'react';
import {
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import {Button, Text, TextInput} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import newstyles from '../Screens/newstyles';
import Icon from "react-native-vector-icons/MaterialIcons";

export default function AddNewStaff({ route, navigation }) {
    const [name, setName] = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [loading, setLoading] = useState(false);



    const pickImage = async () => {
        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (event) => {
                const file = event.target.files[0];
                if (file) {
                    const fileReader = new FileReader();
                    fileReader.onload = () => {
                        setProfileImage(fileReader.result);
                    };
                    fileReader.readAsDataURL(file);
                }
            };
            input.click();
        } else {
            let result = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!result.granted) {
                alert('Permission to access gallery is required!');
                return;
            }
            let pickedImage = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });
            if (!pickedImage.canceled) {
                setProfileImage(pickedImage.assets[0].uri);
            }
        }
    };

    const handleSaveStaff = async () => {
        if (!name) {
            Alert.alert('Error', 'Please fill out all fields with valid values.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('category_name', name);
            formData.append('restaurant_id', '9');

            if (profileImage) {
                formData.append('image', {
                    uri: profileImage,
                    type: 'image/jpeg',
                    name: 'profile.jpg',
                });
            }

            const response = await axios.post(onGetProductionUrl()+'/menu_category/create', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.st === 1) {
                setLoading(false);
                if (route.params?.refresh) {
                    route.params.refresh();
                }
                navigation.goBack();
            } else {
                setLoading(false);
                Alert.alert('Error', 'Failed to save staff. Please try again.');
            }
        } catch (error) {
            Alert.alert('Error', error.message);
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >


            <ScrollView contentContainerStyle={styles.inner}>


                <TextInput
                    label="Category Name"
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    style={newstyles.input}
                />



                <TouchableOpacity onPress={pickImage} style={styles.card}>

                    {!profileImage ? (<View style={styles.cardContent}>
                        <Icon name="cloud-upload" size={40} color="#888" />
                        <Text style={styles.cardTitle}>Click to Upload</Text>
                        <Text style={styles.cardSubtitle}>(Max file size: 5Mb)</Text>
                    </View>):(<Image
                        source={profileImage ? { uri: profileImage } : require('../assets/icons/person.png')}
                        style={styles.image}
                    />)}

                </TouchableOpacity>





                <Button
                    mode="contained"
                    onPress={handleSaveStaff}
                    loading={loading}
                    disabled={loading}
                    style={newstyles.submitButton}
                >
                    Save Category
                </Button>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
    },
    card: {
        width:'100%',
        margin: 15,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        color: '#333',
        marginTop: 10,
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#888',
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 10,
    },




});
