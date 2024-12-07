### Liste des tâches :
---
#### **Backend**  

1. **Développer une API REST avec Flask**  
   - **Statut :** Partiellement fait  
     - Calculer les descripteurs de contenu (histogrammes de couleurs, couleurs dominantes, descripteurs de texture avec filtres de Gabor, moments de Hu, et deux descripteurs supplémentaires). ✅  
     - Retourner les résultats sous une forme lisible pour le frontend.  ✅ 

2. **Implémenter la logique pour organiser les images**   ✅  
   - Regrouper et organiser les images selon les catégories disponibles dans la base de données d'exemples. ✅  

3. **Ajouter la génération de nouvelles images avec transformations**  
   - Créer une fonctionnalité backend pour appliquer des transformations (recadrage, changement d’échelle, etc.) sur des images existantes.  

4. **Développer la recherche d'images similaires**  
   - Implémenter deux méthodes pour la recherche d'images similaires :  
     - Recherche simple.  
     - Recherche avec retour de pertinence.  

---

#### **Frontend**  

5. **Créer l'interface utilisateur pour la gestion des images**  
   - **Statut :** Partiellement fait  
     - Charger (upload), télécharger (download), et supprimer une image ou un ensemble d'images. ✅  
     - Intégrer une interface pour organiser les images selon leurs catégories. ✅ 

6. **Ajouter une interface pour la création d’images transformées**  
   - Intégrer une interface utilisateur permettant d'appliquer des transformations sur des images existantes et de visualiser les résultats.  

7. **Développer une interface utilisateur pour les descripteurs et les requêtes**  
   - Afficher sous une forme convenable les descripteurs calculés pour une image donnée.  
   - Permettre à l'utilisateur :  
     - De sélectionner une image requête.  
     - De visualiser les résultats de recherche d’images similaires (recherche simple et avec retour de pertinence).  

8. **Améliorer l’ergonomie et l’expérience utilisateur (UX/UI)**  
   - Concevoir une interface intuitive et responsive.  
   - Ajouter des feedbacks visuels pour chaque action (chargement, calcul, résultats).

---

#### **Général**  

9. **Concevoir et intégrer deux descripteurs supplémentaires**   ✅  
   - **Statut :** Fait ✅  
   - Proposer et implémenter deux descripteurs (différents des descripteurs existants) basés sur la couleur, la texture ou la forme.  

10. **Tester et valider l’ensemble de l’application**  
    - Vérifier la cohérence entre les fonctionnalités backend et frontend.  
    - Tester l'application avec différents cas d’utilisation pour s’assurer de la robustesse.  

11. **Documenter le travail**  
    - Rédiger un rapport détaillé expliquant les choix techniques, l’implémentation des fonctionnalités, et les résultats obtenus.  

