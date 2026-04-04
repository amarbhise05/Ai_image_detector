from huggingface_hub import HfApi, login

login(token="YOUR_NEW_TOKEN_HERE")

api = HfApi()

# Create the model repo
api.create_repo(
    repo_id="amarbhise31/fake-image-detector",
    repo_type="model",
    exist_ok=True
)

# Upload your model file
api.upload_file(
    path_or_fileobj="model.h5",        # your local h5 file path
    path_in_repo="fake_image_detector.h5",
    repo_id="amarbhise31/fake-image-detector",
    repo_type="model"
)

print("Done!")