FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY webapi/ .
RUN dotnet restore webapi.csproj
RUN dotnet publish webapi.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
COPY --from=build /src/Data/databases ./Data/databases

# ── Node 22, for the load test harness only ──────────────────────────────────
# The harness stays ONE Node implementation, shared with the command line, so the test page cannot
# quietly disagree with the terminal. Its data verification uses `node:sqlite`, which landed in Node
# 22.5, and Debian's own `nodejs` package is far older than that — so this comes from NodeSource
# rather than apt.
#
# If you would rather not carry a second runtime and an external download in the deploy image,
# delete this block, delete the `COPY loadtest/` below, and leave LoadTest:Enabled unset: the
# /loadtest route then reports that the harness is not installed instead of starting it.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && apt-get purge -y curl gnupg && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

# The harness itself, started as a child process by LoadTestController.
COPY loadtest/ ./loadtest/

# Where the SQLite files actually are.
# The harness derives this from its own location by default, which is correct in the repository and
# WRONG here: production keeps the database on a mounted volume, so the path is a fact about the
# deployment rather than something to work out from the code. Point this at wherever the volume is
# mounted if it is not /app/Data/databases.
ENV LOADTEST_DATABASES_DIR=/app/Data/databases

RUN rm -f global.json
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "webapi.dll"]
