FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY webapi/ .
RUN dotnet restore webapi.csproj
RUN dotnet publish webapi.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
COPY --from=build /src/Data/databases ./Data/databases
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "webapi.dll"]
