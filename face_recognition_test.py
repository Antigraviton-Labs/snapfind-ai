"""
Direct Face Recognition with Camera & Image Files
Run: python face_recognition_test.py
"""
import cv2
import numpy as np
from deepface import DeepFace
import time
import os
from pathlib import Path

def process_face(input_data, source_name="camera", is_file=False):
    """Extract face embedding from image or numpy array"""
    try:
        print(f"\n📸 Processing {source_name}...")
        
        if is_file:
            # Handle file path
            img_input = str(input_data)
            print(f"  📂 File: {img_input}")
        else:
            # Handle numpy array (camera frame)
            img_input = input_data
        
        # Try with enforce_detection=True first
        try:
            results = DeepFace.represent(
                img_path=img_input,
                model_name="Facenet",
                enforce_detection=True,
                detector_backend="opencv"
            )
            print("  ✓ Strict detection mode worked")
        except Exception as strict_error:
            # Agar strict detection fail ho to relaxed mode use karo
            print(f"  ⚠️  Strict detection failed: {str(strict_error)[:50]}...")
            print("  🔄 Trying relaxed detection mode...")
            
            try:
                results = DeepFace.represent(
                    img_path=img_input,
                    model_name="Facenet",
                    enforce_detection=False,
                    detector_backend="opencv"
                )
                print("  ✓ Relaxed detection mode worked")
            except Exception as relax_error:
                print(f"  ❌ Both modes failed: {str(relax_error)[:100]}")
                return
        
        if results and len(results) > 0:
            print(f"\n✅ SUCCESS! {len(results)} face(s) found")
            
            for i, result in enumerate(results):
                print(f"\n{'='*40}")
                print(f"📌 Face #{i+1}")
                print(f"{'='*40}")
                
                # Embedding info
                embedding = result.get('embedding', [])
                print(f"✓ Embedding dimensions: {len(embedding)}")
                print(f"✓ First 10 values: {[round(x, 4) for x in embedding[:10]]}")
                
                # Face region
                if 'facial_area' in result:
                    area = result['facial_area']
                    print(f"✓ Face location: ({area['x']}, {area['y']})")
                    print(f"✓ Face size: {area['w']}x{area['h']} pixels")
                
                # Distance (if available)
                if 'distance' in result:
                    print(f"✓ Confidence: {round(result['distance'], 4)}")
                
                print(f"✓ Status: FACE EMBEDDING EXTRACTED")
        else:
            print("\n⚠️  No face detected - result is empty")
            
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {str(e)}")
        print("\n💡 Troubleshooting:")
        print("  - Check if image has a clear face")
        print("  - Ensure good lighting")
        print("  - Try a different image")

def test_from_images():
    """Test with demo images from a folder"""
    print("\n" + "="*60)
    print("🖼️  IMAGE TEST MODE")
    print("="*60)
    print("\nPlace your demo images in: d:\\SnapFindAi\\demo_images\\")
    print("Supported formats: jpg, jpeg, png, bmp")
    
    demo_dir = Path("demo_images")
    
    if not demo_dir.exists():
        print(f"\n📁 Creating demo_images folder...")
        demo_dir.mkdir(exist_ok=True)
        print(f"✅ Folder created! Add your face photos there and run again.")
        return
    
    # Case-insensitive image search
    image_files = list(demo_dir.glob("*.jpg")) + list(demo_dir.glob("*.JPG")) + \
                  list(demo_dir.glob("*.jpeg")) + list(demo_dir.glob("*.JPEG")) + \
                  list(demo_dir.glob("*.png")) + list(demo_dir.glob("*.PNG")) + \
                  list(demo_dir.glob("*.bmp")) + list(demo_dir.glob("*.BMP"))
    
    if not image_files:
        print(f"\n❌ No images found in {demo_dir}")
        print("📌 Add JPG/PNG files to: d:\\SnapFindAi\\demo_images\\")
        return
    
    print(f"\n✅ Found {len(image_files)} image(s)\n")
    
    for idx, img_path in enumerate(image_files, 1):
        print(f"\n{'='*60}")
        print(f"📷 Image {idx}/{len(image_files)}: {img_path.name}")
        print(f"{'='*60}")
        
        # Process image file (pass as string path)
        process_face(img_path, source_name=img_path.name, is_file=True)

def find_camera():
    """Find available camera device"""
    print("\n🔍 Searching for camera devices...")
    
    for i in range(5):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            print(f"✅ Camera found at device {i}")
            cap.release()
            return i
        cap.release()
    
    print("❌ No camera found!")
    return -1

def camera_mode():
    """Live camera mode"""
    print("\n" + "="*60)
    print("📷 CAMERA MODE")
    print("="*60)
    
    # Find available camera
    camera_id = find_camera()
    if camera_id == -1:
        print("\n💡 Tips:")
        print("  1. Check if camera is connected")
        print("  2. Restart the application")
        print("  3. Try Image Test Mode instead (option 2)")
        return
    
    # Camera setup with settings
    cap = cv2.VideoCapture(camera_id)
    
    # Set camera properties for better stability
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    
    if not cap.isOpened():
        print("❌ Camera khul nahi saka!")
        return
    
    print("✅ Camera opened successfully")
    print("Press 'c' to capture face")
    print("Press 'q' to quit")
    print("-" * 60)
    
    while True:
        ret, frame = cap.read()
        
        if not ret:
            print("❌ Frame read error")
            break
        
        # Flip for mirror effect
        frame = cv2.flip(frame, 1)
        
        # Display instructions
        cv2.putText(frame, "Press 'c' to capture | 'q' to quit", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        cv2.imshow("Face Recognition - Camera", frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('c'):  # Capture
            process_face(frame, source_name="camera", is_file=False)
        
        elif key == ord('q'):  # Quit
            print("\n👋 Exiting camera mode...")
            break
    
    cap.release()
    cv2.destroyAllWindows()

def main():
    print("\n" + "="*60)
    print("🎯 FACE RECOGNITION TEST TOOL")
    print("="*60)
    
    while True:
        print("\n\nChoose mode:")
        print("1️⃣  Camera mode (live capture)")
        print("2️⃣  Image test mode (demo images)")
        print("3️⃣  Quit")
        
        choice = input("\nEnter 1, 2, or 3: ").strip()
        
        if choice == "1":
            camera_mode()
        elif choice == "2":
            test_from_images()
        elif choice == "3":
            print("\n👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice! Enter 1, 2, or 3")

if __name__ == "__main__":
    main()
