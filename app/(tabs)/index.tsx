import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Button,
  Alert,
  Switch,
  PanResponder,
  Dimensions,
  Image
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Checkbox, Card } from "react-native-paper";
import debounce from "lodash.debounce";
import Svg, { Path } from "react-native-svg";

export default function App() {
  const [task, setTask] = useState("");
  const [tag, setTag] = useState("");
  const [tasks, setTasks] = useState([]);
  const [editTask, setEditTask] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState([]);
  const [drawings, setDrawings] = useState({});
  const [currentColor, setCurrentColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [viewDrawingId, setViewDrawingId] = useState(null);
  const prevTasksRef = useRef([]);

  const colors = ["#000000", "#FF0000", "#0000FF", "#008000", "#FFA500", "#800080"];

  useEffect(() => {
    loadTasks();
    loadDrawings();
    loadDarkModePreference();
  }, []);

  const saveTasksDebounced = useCallback(
    debounce(async (tasks) => {
      await AsyncStorage.setItem("tasks", JSON.stringify(tasks));
    }, 500),
    []
  );

  useEffect(() => {
    if (JSON.stringify(prevTasksRef.current) !== JSON.stringify(tasks)) {
      saveTasksDebounced(tasks);
      prevTasksRef.current = tasks;
    }
  }, [tasks, saveTasksDebounced]);

  const loadTasks = async () => {
    const storedTasks = await AsyncStorage.getItem("tasks");
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
  };

  const loadDrawings = async () => {
    try {
      const storedDrawings = await AsyncStorage.getItem("drawings");
      if (storedDrawings) {
        setDrawings(JSON.parse(storedDrawings));
      }
    } catch (error) {
      console.log("Lỗi khi tải bản vẽ:", error);
    }
  };

  const saveDrawings = async (newDrawings) => {
    try {
      await AsyncStorage.setItem("drawings", JSON.stringify(newDrawings));
    } catch (error) {
      console.log("Lỗi khi lưu bản vẽ:", error);
    }
  };

  const loadDarkModePreference = async () => {
    try {
      const storedDarkMode = await AsyncStorage.getItem("darkMode");
      if (storedDarkMode !== null) {
        setDarkMode(JSON.parse(storedDarkMode));
      }
    } catch (error) {
      console.log("Lỗi khi tải chế độ tối:", error);
    }
  };

  const saveDarkModePreference = async (value) => {
    try {
      await AsyncStorage.setItem("darkMode", JSON.stringify(value));
      setDarkMode(value);
    } catch (error) {
      console.log("Lỗi khi lưu chế độ tối:", error);
    }
  };

  const addTask = () => {
    if (task.trim()) {
      const newTask = { id: Date.now().toString(), text: task, tag: tag, completed: false };
      setTasks((prevTasks) => [...prevTasks, newTask]);
      setTask("");
      setTag("");
    }
  };

  const toggleComplete = (id) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task))
    );
  };

  const startEditTask = (task) => {
    setEditTask({ ...task });
    setModalVisible(true);
  };

  const saveEditTask = () => {
    if (editTask) {
      setTasks((prevTasks) =>
        prevTasks.map((t) => (t.id === editTask.id ? { ...t, text: editTask.text, tag: editTask.tag } : t))
      );
    }
    setModalVisible(false);
    setEditTask(null);
  };

  const removeTask = (id) => {
    const updatedTasks = tasks.filter((task) => task.id !== id);
    setTasks(updatedTasks);
  };

  const clearAllTasks = () => {
    Alert.alert("Xác nhận", "Bạn có chắc chắn muốn xóa tất cả công việc?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", onPress: () => setTasks([]), style: "destructive" },
    ]);
  };

  const getTagColor = (tag) => {
    if (!tag) return darkMode ? "#888" : "#666";
    
    const lowerTag = tag.toLowerCase();
    if (lowerTag.includes("công việc")) return "#3498db";
    if (lowerTag.includes("cá nhân")) return "#e74c3c";
    if (lowerTag.includes("học tập")) return "#2ecc71";
    return "#9b59b6"; // Mặc định cho các nhãn khác
  };

  // Xử lý vẽ
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event, gestureState) => {
      const { locationX, locationY } = event.nativeEvent;
      setCurrentDrawing([
        ...currentDrawing,
        {
          path: `M ${locationX} ${locationY}`,
          color: currentColor,
          strokeWidth: strokeWidth,
        },
      ]);
    },
    onPanResponderMove: (event, gestureState) => {
      const { locationX, locationY } = event.nativeEvent;
      if (currentDrawing.length > 0) {
        const newPath = currentDrawing.map((item, index) => {
          if (index === currentDrawing.length - 1) {
            return {
              ...item,
              path: item.path + ` L ${locationX} ${locationY}`,
            };
          }
          return item;
        });
        setCurrentDrawing(newPath);
      }
    },
    onPanResponderRelease: () => {},
  });

  const saveDrawing = () => {
    if (currentDrawing.length === 0) {
      Alert.alert("Thông báo", "Không có gì để lưu. Hãy vẽ gì đó trước.");
      return;
    }

    const drawingId = Date.now().toString();
    const updatedDrawings = {
      ...drawings,
      [drawingId]: currentDrawing,
    };

    setDrawings(updatedDrawings);
    saveDrawings(updatedDrawings);
    setCurrentDrawing([]);
    Alert.alert("Thành công", "Đã lưu bản vẽ.");
  };

  const clearDrawing = () => {
    setCurrentDrawing([]);
  };

  const viewDrawing = (drawingId) => {
    setViewDrawingId(drawingId);
  };

  const deleteDrawing = (drawingId) => {
    Alert.alert("Xác nhận", "Bạn có chắc chắn muốn xóa bản vẽ này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        onPress: () => {
          const newDrawings = { ...drawings };
          delete newDrawings[drawingId];
          setDrawings(newDrawings);
          saveDrawings(newDrawings);
          if (viewDrawingId === drawingId) {
            setViewDrawingId(null);
          }
        },
        style: "destructive",
      },
    ]);
  };

  const renderDrawing = (paths) => {
    return paths.map((item, index) => (
      <Path
        key={index}
        d={item.path}
        stroke={item.color}
        strokeWidth={item.strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    ));
  };

  // Hiển thị danh sách bản vẽ đã lưu
  const renderDrawingsList = () => {
    return Object.keys(drawings).map((drawingId) => (
      <View key={drawingId} style={styles.drawingItem}>
        <TouchableOpacity
          style={styles.drawingPreview}
          onPress={() => viewDrawing(drawingId)}
        >
          <Svg height="60" width="60" viewBox="0 0 300 300">
            {renderDrawing(drawings[drawingId])}
          </Svg>
        </TouchableOpacity>
        <Text style={[styles.drawingDate, darkMode && styles.darkText]}>
          {new Date(parseInt(drawingId)).toLocaleString()}
        </Text>
        <TouchableOpacity
          style={styles.deleteDrawingButton}
          onPress={() => deleteDrawing(drawingId)}
        >
          <Text style={styles.deleteText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    ));
  };

  // Toggle giữa danh sách công việc và chế độ vẽ
  const toggleDrawingMode = () => {
    setDrawingMode(!drawingMode);
    if (drawingMode) {
      setCurrentDrawing([]);
      setViewDrawingId(null);
    }
  };

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, darkMode && styles.darkText]}>
          {drawingMode ? "Vẽ tự do" : "To-Do List"}
        </Text>
        <View style={styles.switchContainer}>
          <Text style={[styles.darkModeText, darkMode && styles.darkText]}>
            {darkMode ? "Chế độ tối" : "Chế độ sáng"}
          </Text>
          <Switch
            value={darkMode}
            onValueChange={saveDarkModePreference}
            trackColor={{ false: "#767577", true: "#5e60ce" }}
            thumbColor={darkMode ? "#fff" : "#f4f3f4"}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.toggleModeButton, darkMode && styles.darkToggleButton]}
        onPress={toggleDrawingMode}
      >
        <Text style={styles.buttonText}>
          {drawingMode ? "Quay lại danh sách" : "Chế độ vẽ"}
        </Text>
      </TouchableOpacity>

      {!drawingMode ? (
        // Màn hình To-Do List
        <>
          <TextInput
            style={[styles.input, darkMode && styles.darkInput]}
            placeholder="Nhập công việc..."
            placeholderTextColor={darkMode ? "#aaa" : "#999"}
            value={task}
            onChangeText={setTask}
          />
          <TextInput
            style={[styles.input, darkMode && styles.darkInput]}
            placeholder="Gắn nhãn (Công việc, Cá nhân, Học tập)..."
            placeholderTextColor={darkMode ? "#aaa" : "#999"}
            value={tag}
            onChangeText={setTag}
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.addButton, darkMode && styles.darkAddButton]}
              onPress={addTask}
            >
              <Text style={styles.buttonText}>Thêm</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.clearButton, darkMode && styles.darkClearButton]}
              onPress={clearAllTasks}
            >
              <Text style={styles.buttonText}>Xóa tất cả</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Card style={[styles.taskCard, darkMode && styles.darkCard]}>
                <View style={styles.taskContainer}>
                  <Checkbox
                    status={item.completed ? "checked" : "unchecked"}
                    onPress={() => toggleComplete(item.id)}
                    color={darkMode ? "#6a5acd" : "#3498db"}
                  />
                  <View style={styles.taskContent}>
                    <Text
                      style={[
                        styles.taskText,
                        darkMode && styles.darkText,
                        item.completed && styles.completedText,
                      ]}
                    >
                      {item.text}
                    </Text>
                    <View style={[styles.tagContainer, { backgroundColor: getTagColor(item.tag) + (darkMode ? "33" : "22") }]}>
                      <Text style={[styles.tagText, { color: getTagColor(item.tag) }]}>
                        {item.tag || "Không có nhãn"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => startEditTask(item)}>
                      <Text style={[styles.editText, darkMode && styles.darkEditText]}>Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => removeTask(item.id)}>
                      <Text style={styles.deleteText}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            )}
          />
        </>
      ) : (
        // Màn hình vẽ tự do
        <View style={styles.drawingContainer}>
          {viewDrawingId ? (
            // Xem bản vẽ đã lưu
            <View style={styles.viewDrawingContainer}>
              <Text style={[styles.viewDrawingTitle, darkMode && styles.darkText]}>
                Bản vẽ {new Date(parseInt(viewDrawingId)).toLocaleString()}
              </Text>
              <View style={[styles.drawingCanvas, darkMode && styles.darkDrawingCanvas]}>
                <Svg height="100%" width="100%" viewBox="0 0 300 300">
                  {drawings[viewDrawingId] && renderDrawing(drawings[viewDrawingId])}
                </Svg>
              </View>
              <TouchableOpacity
                style={[styles.button, styles.backButton]}
                onPress={() => setViewDrawingId(null)}
              >
                <Text style={styles.buttonText}>Quay lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Chế độ vẽ mới
            <>
              <View style={[styles.drawingCanvas, darkMode && styles.darkDrawingCanvas]} {...panResponder.panHandlers}>
                <Svg height="100%" width="100%">
                  {renderDrawing(currentDrawing)}
                </Svg>
              </View>
              
              <View style={styles.colorPicker}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      currentColor === color && styles.selectedColor,
                    ]}
                    onPress={() => setCurrentColor(color)}
                  />
                ))}
              </View>
              
              <View style={styles.strokeWidthPicker}>
                <Text style={[styles.strokeWidthLabel, darkMode && styles.darkText]}>Độ dày:</Text>
                <TouchableOpacity
                  style={[styles.strokeOption, strokeWidth === 2 && styles.selectedStrokeWidth]}
                  onPress={() => setStrokeWidth(2)}
                >
                  <View style={[styles.strokePreview, { height: 2 }]} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.strokeOption, strokeWidth === 5 && styles.selectedStrokeWidth]}
                  onPress={() => setStrokeWidth(5)}
                >
                  <View style={[styles.strokePreview, { height: 5 }]} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.strokeOption, strokeWidth === 10 && styles.selectedStrokeWidth]}
                  onPress={() => setStrokeWidth(10)}
                >
                  <View style={[styles.strokePreview, { height: 10 }]} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.drawingButtonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.saveDrawingButton]}
                  onPress={saveDrawing}
                >
                  <Text style={styles.buttonText}>Lưu bản vẽ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.clearDrawingButton]}
                  onPress={clearDrawing}
                >
                  <Text style={styles.buttonText}>Xóa vẽ</Text>
                </TouchableOpacity>
              </View>
              
              {Object.keys(drawings).length > 0 && (
                <View style={styles.savedDrawingsContainer}>
                  <Text style={[styles.savedDrawingsTitle, darkMode && styles.darkText]}>
                    Bản vẽ đã lưu
                  </Text>
                  <FlatList
                    data={Object.keys(drawings)}
                    keyExtractor={(item) => item}
                    horizontal
                    renderItem={({ item }) => (
                      <View style={styles.drawingItem}>
                        <TouchableOpacity
                          style={[styles.drawingPreview, darkMode && styles.darkDrawingPreview]}
                          onPress={() => viewDrawing(item)}
                        >
                          <Svg height="60" width="60" viewBox="0 0 300 300">
                            {renderDrawing(drawings[item])}
                          </Svg>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteDrawingButton}
                          onPress={() => deleteDrawing(item)}
                        >
                          <Text style={styles.deleteText}>Xóa</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                </View>
              )}
            </>
          )}
        </View>
      )}

      {modalVisible && (
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, darkMode && styles.darkModalContent]}>
              <Text style={[styles.modalTitle, darkMode && styles.darkText]}>Chỉnh sửa công việc</Text>
              <TextInput
                style={[styles.modalInput, darkMode && styles.darkInput]}
                value={editTask?.text}
                onChangeText={(text) => setEditTask((prev) => ({ ...prev, text }))}
                placeholder="Nhập nội dung mới..."
                placeholderTextColor={darkMode ? "#aaa" : "#999"}
              />
              <TextInput
                style={[styles.modalInput, darkMode && styles.darkInput]}
                value={editTask?.tag}
                onChangeText={(tag) => setEditTask((prev) => ({ ...prev, tag }))}
                placeholder="Chỉnh sửa nhãn..."
                placeholderTextColor={darkMode ? "#aaa" : "#999"}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, darkMode && styles.darkSaveButton]}
                  onPress={saveEditTask}
                >
                  <Text style={styles.buttonText}>Lưu</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, darkMode && styles.darkCancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Hủy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  darkContainer: {
    backgroundColor: "#121212",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  darkText: {
    color: "#f8f9fa",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  darkModeText: {
    marginRight: 8,
    fontSize: 14,
    color: "#666",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  darkInput: {
    backgroundColor: "#333",
    color: "#fff",
    borderColor: "#555",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flex: 0.48,
  },
  addButton: {
    backgroundColor: "#6a5acd",
  },
  darkAddButton: {
    backgroundColor: "#7b68ee",
  },
  clearButton: {
    backgroundColor: "#e74c3c",
  },
  darkClearButton: {
    backgroundColor: "#c0392b",
  },
  toggleModeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: "#9b59b6",
  },
  darkToggleButton: {
    backgroundColor: "#8e44ad",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  taskCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#6a5acd",
  },
  darkCard: {
    backgroundColor: "#1e1e1e",
    borderLeftColor: "#7b68ee",
  },
  taskContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskContent: {
    flex: 1,
    marginLeft: 8,
  },
  taskText: {
    fontSize: 16,
    marginBottom: 4,
    color: "#333",
  },
  completedText: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  tagContainer: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  actionButtons: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 6,
  },
  editText: {
    color: "#6a5acd",
    fontWeight: "bold",
    marginHorizontal: 4,
  },
  darkEditText: {
    color: "#9f86ff",
  },
  deleteText: {
    color: "#e74c3c",
    fontWeight: "bold",
    marginHorizontal: 4,
  },
  // Styles cho chế độ vẽ
  drawingContainer: {
    flex: 1,
  },
  drawingCanvas: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
  },
  darkDrawingCanvas: {
    backgroundColor: "#2a2a2a",
    borderColor: "#444",
  },
  colorPicker: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: "#333",
  },
  strokeWidthPicker: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  strokeWidthLabel: {
    marginRight: 10,
    fontSize: 16,
    color: "#333",
  },
  strokeOption: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  strokePreview: {
    width: 20,
    backgroundColor: "#000",
  },
  selectedStrokeWidth: {
    borderColor: "#6a5acd",
    borderWidth: 2,
  },
  drawingButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  saveDrawingButton: {
    backgroundColor: "#27ae60",
    flex: 0.48,
  },
  clearDrawingButton: {
    backgroundColor: "#e74c3c",
    flex: 0.48,
  },
  backButton: {
    backgroundColor: "#3498db",
    marginTop: 12,
  },
  savedDrawingsContainer: {
    marginTop: 12,
  },
  savedDrawingsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  drawingItem: {
    marginRight: 12,
    alignItems: "center",
  },
  drawingPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
  },
  darkDrawingPreview: {
    backgroundColor: "#2a2a2a",
    borderColor: "#444",
  },
  drawingDate: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
    width: 80,
    textAlign: "center",
  },
  deleteDrawingButton: {
    marginTop: 4,
  },
  viewDrawingContainer: {
    flex: 1,
  },
  viewDrawingTitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
    color: "#333",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    width: "85%",
    elevation: 5,
  },
  darkModalContent: {
    backgroundColor: "#222",
    borderColor: "#444",
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flex: 0.48,
  },
  saveButton: {
    backgroundColor: "#6a5acd",
  },
  darkSaveButton: {
    backgroundColor: "#7b68ee",
  },
  cancelButton: {
    backgroundColor: "#e74c3c",
  },
  darkCancelButton: {
    backgroundColor: "#c0392b",
  },
});