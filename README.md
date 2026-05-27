<div style="text-align: center;">
   <img width="320" height="66" src="reactapp/src/assets/images/home/logo320.png" alt="Logo">
</div>

# Table of Contents

* [Description](#description)
* [Technology Stack](#technology-stack)
* [Deployment](#deployment)
* [License](#license)

# Description

The AlgeSPACE web application is hosted at https://algespace.sic.saarland/ and was developed as part of a Master's thesis project in Computer Science at Saarland University.

The website includes multiple Intelligent Tutoring Systems (ITSs) for fostering a conceptual understanding in solving systems of two linear equations in two unknown variables with the equalization, substitution, and elimination methods, as well as one ITS for training flexibility in solving linear systems with the three mentioned methods. The website and its learning contents are freely accessible to researchers, educators and students.

To better understand the motivations and goals for developing the web application, read the thesis' abstract in the following section.

### Abstract of Master's thesis

This thesis pursues different objectives. In collaboration with a high school mathematics teacher, we designed and developed learning software for fostering a conceptual understanding of the different methods for solving systems of two linear equations. The software does not only meet the teacher's practical and instructional needs, but also addresses the lack of research on conceptual approaches to teaching about linear systems. Inspired by the teacher's approach of explaining mathematical concepts through figurative language and analogies, we derived representations that visualize the mathematical concepts underlying the different methods. While visual representations like pie charts are often utilized in mathematics lessons in high school, concrete representations, such as images in place of abstract variables in linear systems, are more commonly employed at the elementary school level. Thus, this work also gives insights into how advanced students could benefit from learning with concrete visual representations. We gathered qualitative feedback from three high school classes on the usability and the design of the developed learning software. Moreover, we conducted a case study with three students of different levels of mathematical proficiency to understand how the software impacted their conceptual understanding of the topic. The study's results indicate that students who face challenges in understanding abstract mathematical concepts may particularly benefit from visual learning through concrete representations.

An important goal of education is helping students to become independent, self-regulated learners. The second objective of this work targets the question of how to design learning software that supports students in making more strategic decisions throughout their learning process. Literature proposes that providing learners with choices enhances their engagement and motivation, which are both indicators for academic performance. While choice-making behaviours have been assessed in the context of self-regulated learning, it remains unclear how to effectively support and scaffold learners in their decision-making process. Recent research has examined the effect of including virtual characters like pedagogical agents for guidance in learning software. Although the overall impact of these agents on learning outcomes is relatively small, many studies suggest that agents can enhance self-regulation, motivation and engagement. We developed a learning environment on training flexibility in solving linear systems, in which students are offered the choice to work on additional voluntary exercises that are beneficial for their learning. In a classroom study involving three high school classes, we examined if students are more likely to work on voluntary exercises if the choice is presented by a motivational pedagogical agent. Our findings show that students who practised with the support of pedagogical agents tended to achieve higher learning outcomes. However, the overall impact of the condition on motivation and engagement in voluntary exercises was smaller than anticipated. Students across conditions and different levels of prior knowledge demonstrated diverse choice-making patterns, indicating that adaptive designs are necessary to support different types of learners in their learning process.

### Documentation

The codebase is logically divided into two parts: The frontend and the backend. Everything related to the fronted (React app) is located in the [reactapp](reactapp) folder, while the backend implementation (Web API, services for authentication and authorization, databases) can be found in the [webapi](webapi) folder. Detailed information on each part of the code can be found in their respective folders.

# Technology Stack

We relied on different frameworks and libraries for the frontend and backend development
of the web application:

### Frontend Technologies

Deployed technologies:
* React 18.2: https://react.dev/reference/react
* TypeScript 5.3
* Vite 5.0: https://vitejs.dev/guide
* SASS 1.69: https://sass-lang.com/documentation
* react-i18next 13.5: https://react.i18next.com
* Autoprefixer 10.5: https://github.com/postcss/autoprefixer

The user interface was implemented in React, which is a free and open-source JavaScript-based library for developing user interfaces maintained by Meta. React is widely adopted for developing single-page applications and facilitates the creation of reusable components, which improves the scalability and maintainability of the code base. To further enhance code quality, we incorporated TypeScript for static type-checking. We also included SASS, which is a CSS preprocessor for structuring CSS files.

We selected Vite as our build tool for compiling the code into a static website. Vite is popular due to its minimal configuration, native TypeScript integration, and Hot Module Replacement, which simplifies the development process. Additionally, Vite supports the integration of PostCSS plug-ins like Autoprefixer that add vendor prefixes to CSS rules to ensure cross-browser compatibility.

One notable framework that we use in production is react-i18next, which is used for detecting the user's language and loading the corresponding translations. Moreover, the framework's interpolation feature helps us to easily adapt the text contents in the exercises of the ITSs. For example, we can use the same task description for the simplification step in each exercise of the ITS for the equalization method, but adapt the name of the pictured item to fit the exercise.

### Backend Technologies

Deployed technologies:
* ASP.NET 8.0: https://learn.microsoft.com/de-de/aspnet/core/?view=aspnetcore-8.0
* SQLite 3: https://www.sqlite.org/docs.html
* Dapper 2.1: https://github.com/DapperLib/Dapper

We used ASP.NET Core 8.0 for the development of the backend application due to our familiarity with the .NET framework and the C# programming language. ASP.NET Core is a high-performance and open-source web application framework developed by Microsoft that among others provides tools for creating REST-APIs. Moreover, the framework supports different platforms, which is important as we locally develop the code base on Windows, but host the application on a Linux server provided by the university. Additionally, the framework provides libraries for implementing authentication and authorization using JSON Web Tokens.

To store the data for the exercises as well as the log data from the studies, we used SQLite as a relational database as it is fast and lightweight compared to other SQL databases. We chose Dapper as a .NET tool for accessing the database. Dapper is known to be efficient and facilitates the execution of parametrized SQL queries and mapping the queried results to concrete objects.

# Deployment

### 1. Local Deployment

#### Prerequisites

* Install Node.js and npm (see https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

* Install .NET 8.0 (see https://dotnet.microsoft.com/en-us/download/dotnet/8.0)

* Install SQLite (see https://www.sqlite.org/download.html)

#### Getting Started

1. Clone the repository

2. Navigate to */reactapp* and install the required npm packages:
    ```sh
    npm install
   ```

3. Create a file named *appsettings.json* in the folder */webapi*, copy the following lines and switch *MY_SECRET* for your own key:  
   ```json
   {
     "AuthSettings": {
       "Secret": "MY_SECRET"
     }
   }
   ```` 
   The secret key is required for signing the JWT.

4. To start the ASP.NET Web API (backend), use a code editor like Visual Studio or run
    ```sh
    dotnet run
   ```
   in a developer console. This runs the API in development mode.

5. To start the React web app (frontend), run 
    ```sh
    npm run dev
   ```
   in a developer console. Now you should be apple to access the web app under *localhost:5173* in a browser of your choice.
   
If you would like to test your code in production, both, the frontend and the backend require an API key as an additional security measure. The frontend must send the key with every request in order to be able to communicate with the backend API. To add an additional key, follow the next two steps:

6. Add a key to the *appsettings.json* file in the folder */webapi*:
   ```json
   {
     "ApiKey": "MY_APIKEY",
     "AuthSettings": {
       "Secret": "MY_SECRET"
     }
   }
   ```` 
   Switch *MY_APIKEY* for your own key.

7. In the React app insert a new file *.env* in the root directory of */reactapp* containing the same key: 
   ```
   VITE_API_KEY = MY_APIKEY
   ```
   
### 2. Server deployment

#### Prerequisites

The server hosted on *algespace.sic.saarland* relies on Linux as an operating system. Therefore, the following commands can be executed to install the prerequisites listed in the last section:
```sh
sudo apt install -y nodejs npm
sudo apt install -y dotnet-sdk-8.0
sudo apt install -y sqlite3 
```
Instead of installing Node.js and npm directly, we recommend using a version manager like nvm to install the software.

We need NGINX for two purposes: To serve the static website build from the React app with Vite and to act as a reverse proxy, i.e. to forward requests from the frontend to the ASP.NET Web API and to return the backend's response. NGINX can be installed with the following command:
```sh
sudo apt install -y nginx
```

#### Getting Started

1. Clone the repository

2. Set up a secret key for JWT authentication and authorization to the ASP.NET Web Api (step 3 in local deployment).

3. Add an API key to authenticate requests to the ASP.NET Web API as explained in step 6 and 7 of the local deployment.

4. The port and the domain name used by the ASP.NET Web API on the server is different compared to the local deployment. I.e., we also have to adapt our frontend requests to the backend. The frontend uses Axios as an HTTP Client. We need to modify the Axios configuration under */reactapp/src/types/shared/axiosinstance*, specifically the following line:
   ```ts
   baseURL: "https://DOMAIN_NAME:5000" // Prior: "http://localhost:7273"
   ```
   Here, *DOMAIN_NAME* is equal to *algespace.sic.saarland*.

5. Build the React app:
   ```sh
   npm run build
   ```
   The command should create a folder named *dist* in the root directory of the app. This folder contains the static files that we want to host.

6. The configuration for NGINX can be found at */etc/nginx/conf.d/DOMAIN_NAME.conf* and looks roughly like:
   ```
   server {
      root PATH_TO_PROJECT/algespace/reactapp/dist;
      index index.html index.htm;
      server_name DOMAIN_NAME;
      location / {
         try_files $uri /index.html;
      }
   }
   ```
   NGINX requires the ports 80 and 443 to be enabled:
    ```sh
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   # Verify rules: sudo ufw status numbered
   ```

7. The ASP.NET Web API should consistently run on the server, i.e. we need to deploy it as a service. The service at */etc/systemd/system/algespace-webapi.service*
   ```
   [Unit]
   Description=.NET Web API App for algespace running on Ubuntu
   
   [Service]
   WorkingDirectory=PATH_TO_PROJECT/algespace/webapi/
   ExecStartPre=/usr/bin/dotnet publish --output build/ --configuration release
   ExecStart=/usr/bin/dotnet build/webapi.dll --urls=https://DOMAIN_NAME:5000/
   Restart=always
   # Restart service after 10 seconds if the dotnet service crashes:
   RestartSec=10
   KillSignal=SIGINT
   SyslogIdentifier=dotnet-algespace-webapi
   User=root
   Environment=ASPNETCORE_ENVIRONMENT=Production
   Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false
   
   [Install]
   WantedBy=multi-user.target
   ```
   can be restarted with the command
   ```sh
   sudo systemctl restart algespace-webapi.service
   ```
   and automatically triggers the backend to be build (files are published to */build* folder in root directory of */webapi*) and to be deployed in production mode. As the Web API listens on the port 5000, we have to enable this port in the firewall:
    ```sh
   sudo ufw allow 5000
   sudo ufw enable
   ```
   
8. It is recommended to obtain a certificate for the server to ensure a secure connection between the server and the client. At the moment we are using *Let’s Encrypt* as a Certificate Authority. The certificate will be added to the NGINX configuration file automatically when using an ACME like Certbot. The Web API also uses the certificate, which has to be manually added to the *appsettings.json* file:
   ```json
   {
      "Kestrel": {
        "Certificates": { 
          "Default": {
            "Path": "PATH_TO_CERTIFICATE/fullchain.pem",
            "KeyPath": "PATH_TO_CERTIFICATE/privkey.pem"
          }
        }
      }
   }
   ```` 

9. The project is currently located at */opt/algespace* on the server.

# License

This project is licensed under the terms of the MIT license. See the LICENSE file for details.