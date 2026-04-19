package ch.zhaw.deeplearningjava.footwear;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.File;

@RestController
public class ClassificationController {

    private Inference inference = new Inference();

    @GetMapping("/ping")
    public String ping() {
        return "Classification app is up and running!";
    }

    @PostMapping(path = "/analyze")
    public String predict(@RequestParam("image") MultipartFile image) throws Exception {
        if (isDockerized()) {
            return predictWithServing(image);
        }
        return inference.predict(image.getBytes()).toJson();
    }

    private String predictWithServing(MultipartFile image) throws Exception {
        var uri = "http://model-service:8080/predictions/shoeclassifier";
        WebClient webClient = WebClient.create();
        Resource resource = new ByteArrayResource(image.getBytes()) {
            @Override
            public String getFilename() {
                return image.getOriginalFilename();
            }
        };

        return webClient.post()
                .uri(uri)
                .contentType(MediaType.valueOf(MediaType.MULTIPART_FORM_DATA_VALUE))
                .body(BodyInserters.fromMultipartData("data", resource))
                .retrieve()
                .bodyToMono(String.class)
                .block();
    }

    private boolean isDockerized() {
        File f = new File("/.dockerenv");
        return f.exists();
    }

}
