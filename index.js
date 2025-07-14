import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/gamepasses", async (req, res) => {
  const userId = req.query.userId;
  console.log(`Buscando gamepasses para usuário: ${userId}`);
  
  if (!userId) return res.status(400).send("Missing userId");

  try {
    // Use games API to get user's games first, then get gamepasses for each game
    const gamesResponse = await axios.get(
      `https://games.roblox.com/v2/users/${userId}/games`,
      {
        params: {
          accessFilter: "Public",
          limit: 50,
        },
      }
    );

    console.log(`Encontrados ${gamesResponse.data.data.length} jogos para o usuário`);
    
    const allPasses = [];
    
    // For each game, get its gamepasses
    for (const game of gamesResponse.data.data) {
      console.log(`Verificando gamepasses para o jogo: ${game.name} (ID: ${game.id}, rootPlace: ${game.rootPlace.id})`);
      
      // Try with universe ID first
      try {
        let cursor = "";
        let totalGamePasses = 0;
        
        do {
          const params = { limit: 50 };
          if (cursor) params.cursor = cursor;
          
          const passesResponse = await axios.get(
            `https://games.roblox.com/v1/games/${game.id}/game-passes`,
            { params }
          );
          
          if (passesResponse.data.data && passesResponse.data.data.length > 0) {
            const gamePassIds = passesResponse.data.data.map((pass) => pass.id);
            allPasses.push(...gamePassIds);
            totalGamePasses += gamePassIds.length;
          }
          
          cursor = passesResponse.data.nextPageCursor;
        } while (cursor);
        
        if (totalGamePasses > 0) {
          console.log(`✓ Encontrados ${totalGamePasses} gamepasses para ${game.name}`);
        } else {
          console.log(`- Nenhum gamepass encontrado para ${game.name}`);
        }
      } catch (gamePassErr) {
        console.log(`- Erro com universe ID ${game.id} para ${game.name}: ${gamePassErr.response?.status}`);
        
        // Try with rootPlace ID as fallback
        try {
          console.log(`Tentando com rootPlace ID ${game.rootPlace.id}...`);
          let cursor = "";
          let totalGamePasses = 0;
          
          do {
            const params = { limit: 50 };
            if (cursor) params.cursor = cursor;
            
            const passesResponse = await axios.get(
              `https://games.roblox.com/v1/games/${game.rootPlace.id}/game-passes`,
              { params }
            );
            
            if (passesResponse.data.data && passesResponse.data.data.length > 0) {
              const gamePassIds = passesResponse.data.data.map((pass) => pass.id);
              allPasses.push(...gamePassIds);
              totalGamePasses += gamePassIds.length;
            }
            
            cursor = passesResponse.data.nextPageCursor;
          } while (cursor);
          
          if (totalGamePasses > 0) {
            console.log(`✓ Encontrados ${totalGamePasses} gamepasses para ${game.name} usando rootPlace ID`);
          } else {
            console.log(`- Nenhum gamepass encontrado para ${game.name} mesmo com rootPlace ID`);
          }
        } catch (rootPlaceErr) {
          console.log(`- Erro também com rootPlace ID ${game.rootPlace.id}: ${rootPlaceErr.response?.status}`);
        }
      }
    }

    console.log(`Total de gamepasses encontrados: ${allPasses.length}`);
    res.json({
      success: true,
      total: allPasses.length,
      gamepassIds: allPasses
    });
  } catch (err) {
    console.error("Erro ao buscar gamepasses:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar gamepasses",
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor online na porta ${PORT}`);
});

