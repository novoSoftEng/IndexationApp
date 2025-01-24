# MULTIMEDIA MINING INDEXING Project :

# -> 3D Model Content-Based Indexing and Retrieval System

## Project Purpose

The goal of this project is to develop the core functionalities of a **content-based indexing and retrieval system** for a database of 3D models. The system calculates shape descriptors for a query model, measures similarity with models in the database, and identifies the closest matches. The project emphasizes using mathematical transformations to represent 3D models in invariant and compact feature spaces for efficient comparison and search.

---

## ⚠️ Important Information

- **main** Branch -> 2D Content-Based Image Retrieval System
- **3d** Branch -> 3D object search and retrieval Application

---

## Features

### Core Functionality

1. **Descriptor Calculation**:
   - **Fourier Coefficients**: Utilize 3D Fourier Transform to represent 3D objects in the frequency domain. This transformation is effective for analyzing shape features invariant to translation, rotation, and scaling.
   - **Zernike Moments**: Implement Zernike Transform, leveraging orthogonal polynomials to extract shape structures. This method is robust for capturing invariant features of 3D objects.

2. **Search and Retrieval**:
   - Compare the shape descriptors of the query model with the descriptors in the database.
   - Return the most similar models based on shape similarity metrics.

3. **Invariant Descriptors**:
   - Ensure descriptors are invariant to **rotation**, **translation**, and **scaling**, making the system robust for diverse 3D models.

### Additional Features

- A database of 3D models provided from [this benchmark dataset](http://www.ipet.gr/~akoutsou/benchmark/).
- Algorithms for preprocessing 3D models to optimize descriptor calculation.
- Comparative analysis of search accuracy:
  - With and without mesh simplification.
  - Using Fourier Coefficients and Zernike Moments.

### Report

The project includes a detailed report covering:

- **Implementation Results**: Insights into the descriptor calculations.
- **Comparative Study**: Evaluation of the system using Fourier Coefficients and Zernike Moments, highlighting the impact of mesh reduction on accuracy and efficiency.

---

## How to Use

1. Clone the repository.

``` cmd
git clone https://github.com/novoSoftEng/IndexationApp.git
cd IndexationApp
git checkout 3d
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
