# MULTIMEDIA MINING INDEXING Project :


# -> 2D Content-Based Image Retrieval System

## Overview

This project is a web application designed to implement the core functionalities of a **2D Content-Based Image Retrieval System** with and without relevance feedback. Users can upload, manage, and search for images based on their visual content using advanced algorithms. The application supports two primary search methods: simple retrieval and advanced retrieval with **Query-Point Movement** relevance feedback.

---

## ⚠️ Important Information

- main Branch -> 2D Content-Based Image Retrieval System
- 3d Branch -> 3D object search and retrieval Application

---

## Features

### General Features

- Upload, download, and delete single or multiple images.
- Organize images into predefined categories based on the dataset.
- Apply transformations to images, such as cropping, scaling, rotation, and flipping.
- Visualize image content descriptors including:
  - **Color Histogram**
  - **Dominant Colors**
  - **Texture Descriptors** (Gabor filters)
  - **Hu Moments** (shape descriptors)
  - **Average Color**
  - **Edge Histogram**

### Search Functionalities

1. **Simple Search**:
   - Compares the query image to database images using visual descriptors.
   - Computes a global score by combining weighted distances for:
     - Color (histograms, dominant colors, average color)
     - Texture
     - Shape (Hu moments, edge histogram)
   - Returns the closest matches sorted by score.

2. **Advanced Search with Relevance Feedback**:
   - Refines search results using user feedback.
   - Dynamically adjusts descriptor weights based on relevant and non-relevant images.
   - Implements the **Query-Point Movement** method to improve search results iteratively.

---

## Architecture

The application uses a hybrid architecture combining **MEAN stack** (MongoDB, Express.js, Angular, Node.js) and **Flask** for efficient functionality.

### Back-end: Flask

- Handles image processing and descriptor computation.
- Provides a RESTful API to:
  - Calculate image descriptors.
  - Perform transformations like cropping, scaling, rotation, and flipping.
  - Execute both search methods.

### API: Express.js

- Serves as an intermediary between the Angular front-end and the Flask back-end.
- Manages requests for image upload, deletion, and search.

### Front-end: Angular

- Provides a user-friendly interface for:
  - Uploading and managing images.
  - Viewing computed descriptors.
  - Visualizing search results.

### Database: MongoDB

- Stores image descriptors and metadata.
- Facilitates the categorization of images.

---

## Datasets

### RSSCN7

- **Description**: Robust Scene Text Image Dataset with Seven Categories.
- **Categories**: Resident, Forest, Industry, and more (7 categories, 400 images each).
- **Total Images**: 2800.
- **Purpose**: Used for detecting and recognizing text in real-world scenes.
- **Source**: [RSSCN7 GitHub Repository](https://github.com/palewithout/RSSCN7?tab=readme-ov-file).

---

## Algorithms

### Simple Search Algorithm

1. Calculates distances for:
   - Color (histogram, average, dominant colors)
   - Texture (Gabor filters)
   - Shape (Hu moments, edge histogram)
2. Combines distances with predefined weights.
3. Ranks images based on the weighted scores.

### Query-Point Movement (Relevance Feedback)

1. Updates weights dynamically based on:
   - Scores of relevant images.
   - Scores of non-relevant images.
   - Normalization factors to maintain weight consistency.
2. Refines search results iteratively to align with user preferences.

---

## How to Use

1. Clone the repository.

``` cmd
git clone https://github.com/novoSoftEng/IndexationApp.git
cd IndexationApp
```

2. Install dependencies and run Flask API (Terminal 1)

``` py
cd api
pip install -r requirements.txt
```

3. Install dependencies and Start the back-end and the Express.js API (Terminal 2)

   ``` py
   cd api
   npm install
   npm start
   ```

4. Install dependencies and Run the Angular front-end (Terminal 3)

   ``` py
   cd Client
   npm install
   npm start
   ```

5. Go to THis link : `http://localhost:4200/`

6. Upload images, calculate descriptors, and explore the search functionalities.

---

## About This Project

This Project is Devloped by :

- **Idriss Khattabi**
- **Chihab Eddine LIEFRID**
- **Ayman Boufarhi**

Under the supervision of : **MR. M'hamed AIT KBIR**.
