module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
  collectCoverageFrom: ["**/*.js", "!node_modules/**", "!dist/**"],
  moduleFileExtensions: ["js", "jsx"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupEnv.js"],
};







