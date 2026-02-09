/**
 * Free Time Notes Modal
 * Modal for adding/editing notes during free time
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { FreeTimeNote } from '../../utils/scheduleStorage';

interface FreeTimeNotesModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (note: FreeTimeNote) => void;
    existingNote?: FreeTimeNote;
    timeSlot: string;
}

export default function FreeTimeNotesModal({
    visible,
    onClose,
    onSave,
    existingNote,
    timeSlot,
}: FreeTimeNotesModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (visible && existingNote) {
            setTitle(existingNote.title);
            setContent(existingNote.content);
        } else if (visible) {
            setTitle('');
            setContent('');
        }
    }, [visible, existingNote]);

    const handleSave = () => {
        if (title.trim() || content.trim()) {
            onSave({
                title: title.trim(),
                content: content.trim(),
                timeSlot,
            });
        }
        onClose();
    };

    const handleCancel = () => {
        setTitle('');
        setContent('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Icon name="note-text" size={24} color="#f59e0b" />
                            <Text style={styles.headerTitle}>Free Time Note</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Time slot display */}
                        <View style={styles.timeSlotBadge}>
                            <Icon name="clock-outline" size={14} color="#d97706" />
                            <Text style={styles.timeSlotText}>{timeSlot}</Text>
                        </View>

                        {/* Title input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Title (optional)</Text>
                            <TextInput
                                style={styles.titleInput}
                                placeholder="e.g., Lunch break, Coffee, Personal time"
                                placeholderTextColor="#94a3b8"
                                value={title}
                                onChangeText={setTitle}
                                maxLength={50}
                            />
                        </View>

                        {/* Content input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Notes (optional)</Text>
                            <TextInput
                                style={styles.contentInput}
                                placeholder="Add any notes about what you plan to do during this time..."
                                placeholderTextColor="#94a3b8"
                                value={content}
                                onChangeText={setContent}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                maxLength={200}
                            />
                            <Text style={styles.charCount}>
                                {content.length}/200
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Action buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={handleSave}
                        >
                            <Icon name="check" size={18} color="#fff" style={styles.buttonIcon} />
                            <Text style={styles.saveButtonText}>Save Note</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modal: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        borderTopWidth: 3,
        borderTopColor: '#f59e0b',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f8fafc',
        marginLeft: 10,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    timeSlotBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 20,
    },
    timeSlotText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#78350f',
        marginLeft: 6,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#cbd5e1',
        marginBottom: 8,
    },
    titleInput: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#f8fafc',
    },
    contentInput: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#f8fafc',
        minHeight: 100,
    },
    charCount: {
        fontSize: 11,
        color: '#64748b',
        textAlign: 'right',
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 10,
    },
    cancelButton: {
        backgroundColor: '#334155',
    },
    saveButton: {
        backgroundColor: '#f59e0b',
    },
    buttonIcon: {
        marginRight: 6,
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#cbd5e1',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
});
