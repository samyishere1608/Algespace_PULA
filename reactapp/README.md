The React app is organized into several directories to maintain a clean and scalable codebase:

* [src/views](src/views): Contains the different views or pages of the application, such as Home.tsx.
* [src/routes](src/routes): Includes definitions and configurations of routes. [overview_routes_components.png](overview_routes_components.png) shows on overview of the website's navigation, explaining which views and routes are associated.
* [src/components](src/components): Reusable components deployed in the views.
* [src/contexts](src/contexts): React contexts are used for data management. For example, AuthProvider.tsx stores information about logged-in students.
* [src/hooks](src/hooks): React hooks can be used to store and update specifics states, like the orientation of the device or data collected in a study.
* [src/types](src/types): TypeScript type definitions
* [src/utils](src/utils): Useful methods
* [src/assets/images](src/assets/images): Stores files for all images included in the different Intelligent Tutoring Systems (ITSs).
* [src/assets/translations](src/assets/translations): English and German translations for instructions, hints, feedback a.so. depicted in the ITSs.
* [src/assets/styles](src/assets/styles): Stylesheets embedded in views and components.

Most directories are further divided into subdirectories named after their specific function, such as "equalization" or "flexibility",  to indicate which  components or styles belong to each view or part of the learning software.
 