FROM eclipse-temurin:25-jdk-noble

WORKDIR /usr/src/app
COPY models models
COPY src src
COPY .mvn .mvn
COPY pom.xml mvnw ./
RUN chmod +x mvnw

RUN ./mvnw -Dmaven.test.skip=true package

EXPOSE 8080
CMD ["java","-jar","/usr/src/app/target/playground-0.0.1-SNAPSHOT.jar"]