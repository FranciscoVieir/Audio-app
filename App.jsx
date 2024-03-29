import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { FontAwesome } from '@expo/vector-icons';

export default function App() {
	const [recording, setRecording] = useState(null);
	const [recordingStatus, setRecordingStatus] = useState('idle');
	const [audioPermission, setAudioPermission] = useState(null);
	const [playbackObject, setPlaybackObject] = useState(null);

	useEffect(() => {
		// Simply get recording permission upon first render
		async function getPermission() {
			await Audio.requestPermissionsAsync()
				.then((permission) => {
					console.log('Permission Granted: ' + permission.granted);
					setAudioPermission(permission.granted);
				})
				.catch((error) => {
					console.log(error);
				});
		}

		// Call function to get permission
		getPermission();
		// Cleanup upon first render
		return () => {
			if (recording) {
				stopRecording();
			}
			if (playbackObject) {
				playbackObject.unloadAsync();
			}
		};
	}, []);

	async function startRecording() {
		try {
			// needed for IoS
			if (audioPermission) {
				await Audio.setAudioModeAsync({
					allowsRecordingIOS: true,
					playsInSilentModeIOS: true,
				});
			}

			const newRecording = new Audio.Recording();
			console.log('Starting Recording');
			await newRecording.prepareToRecordAsync(
				Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
			);
			await newRecording.startAsync();
			setRecording(newRecording);
			setRecordingStatus('recording');
		} catch (error) {
			console.error('Failed to start recording', error);
		}
	}

	async function stopRecording() {
		try {
			if (recordingStatus === 'recording') {
				console.log('Stopping Recording');
				await recording.stopAndUnloadAsync();
				const recordingUri = recording.getURI();

				// Create a file name for the recording
				const fileName = `recording-${Date.now()}.caf`;

				// Move the recording to the new directory with the new file name
				await FileSystem.makeDirectoryAsync(
					FileSystem.documentDirectory + 'recordings/',
					{ intermediates: true }
				);
				await FileSystem.moveAsync({
					from: recordingUri,
					to: FileSystem.documentDirectory + 'recordings/' + `${fileName}`,
				});

				// This is for simply playing the sound back
				const newPlaybackObject = new Audio.Sound();
				await newPlaybackObject.loadAsync({
					uri: FileSystem.documentDirectory + 'recordings/' + `${fileName}`,
				});
				setPlaybackObject(newPlaybackObject);

				// resert our states to record again
				setRecording(null);
				setRecordingStatus('stopped');
			}
		} catch (error) {
			console.error('Failed to stop recording', error);
		}
	}

	async function handleRecordButtonPress() {
		if (recording) {
			await stopRecording(recording);
		} else {
			await startRecording();
		}
	}

	async function playRecording() {
		try {
			console.log('Playing Sound');
			if (playbackObject) {
				await playbackObject.playAsync();
			} else {
				console.warn('Sound not loaded yet.');
			}
		} catch (err) {
			console.error('Failed to play sound', err);
		}
	}

	return (
		<View style={styles.container}>
			<TouchableOpacity style={styles.button} onPress={handleRecordButtonPress}>
				<FontAwesome
					name={recording ? 'stop-circle' : 'circle'}
					size={64}
					color="white"
				/>
			</TouchableOpacity>
			{playbackObject && (
				<TouchableOpacity style={styles.button} onPress={playRecording}>
					<FontAwesome name="play-circle" size={64} color="green" />
				</TouchableOpacity>
			)}
			<Text
				style={styles.recordingStatusText}
			>{`Recording status: ${recordingStatus}`}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	button: {
		alignItems: 'center',
		justifyContent: 'center',
		width: 128,
		height: 128,
		borderRadius: 64,
		backgroundColor: 'red',
		marginVertical: 10,
	},
	recordingStatusText: {
		marginTop: 16,
	},
});
